/**
 * Full regression checks (run against dev server + DB).
 * Usage: node --env-file=.env scripts/regression.mjs [baseUrl]
 */
import crypto from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const BASE = args[0] ?? "http://localhost:3000";
const DEV_BYPASS_OWNER_ID = "00000000-0000-0000-0000-000000000000";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function verifyCronRequest(request, env) {
  if (env.NODE_ENV === "development") return true;

  const secret = env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const provided = bearer ?? cronHeader?.trim();
  if (!provided) return false;

  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

async function fetchOk(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  return { res, text };
}

// ── 1. Landing page + nav anchors ──────────────────────────────────────────
try {
  const { res, text } = await fetchOk(BASE + "/");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!text.includes("LandingNavbar") && !text.includes("Formline") && !text.includes("Send forms"))
    throw new Error("missing landing content");
  const navIds = ["features", "templates", "workspace", "use-cases", "how", "pricing"];
  const missing = navIds.filter((id) => !text.includes(`id="${id}"`));
  if (missing.length) throw new Error(`missing sections: ${missing.join(", ")}`);
  if (!text.includes('href="#features"') && !text.includes("#features"))
    throw new Error("navbar hash links not found in HTML");
  pass("Landing page loads with nav section anchors", navIds.join(", "));
} catch (err) {
  fail("Landing page loads with nav section anchors", err.message);
}

// ── 2. Authenticated layout reachable with dev bypass cookie ───────────────
try {
  const { res, text } = await fetchOk(BASE + "/dashboard", {
    headers: { Cookie: "bypass=true" },
  });
  if (res.status === 401 || res.status === 302 && text.includes("/auth")) {
    throw new Error(`redirected to auth (${res.status})`);
  }
  if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  pass("Dev bypass allows /dashboard", `HTTP ${res.status}`);
} catch (err) {
  fail("Dev bypass allows /dashboard", err.message);
}

// ── 3. Cron auth logic (production mode simulation) ────────────────────────
try {
  const req = new Request("http://localhost/api/cron/weekly-summary");
  const prodNoSecret = verifyCronRequest(req, { NODE_ENV: "production" });
  const prodWithSecret = verifyCronRequest(
    new Request("http://localhost/api/cron/weekly-summary", {
      headers: { Authorization: "Bearer test-secret-123" },
    }),
    { NODE_ENV: "production", CRON_SECRET: "test-secret-123" },
  );
  const devOpen = verifyCronRequest(req, { NODE_ENV: "development" });
  if (prodNoSecret !== false) throw new Error("prod without secret should reject");
  if (prodWithSecret !== true) throw new Error("prod with matching secret should accept");
  if (devOpen !== true) throw new Error("dev should allow without secret");
  pass("Cron verifyCronRequest: 401 in prod without secret");
} catch (err) {
  fail("Cron verifyCronRequest: 401 in prod without secret", err.message);
}

// ── 4. Live cron route in dev (open) vs production preview ─────────────────
try {
  const { res, text } = await fetchOk(BASE + "/api/cron/weekly-summary");
  if (process.env.NODE_ENV === "development" || BASE.includes("localhost")) {
    if (res.status === 401) throw new Error("dev server should not 401 without secret");
    pass("Cron route on dev server", `HTTP ${res.status}`);
  } else {
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}: ${text.slice(0, 120)}`);
    pass("Cron route returns 401 without secret in production", `HTTP ${res.status}`);
  }
} catch (err) {
  fail("Cron route HTTP check", err.message);
}

// ── 5. DB schema + settings persistence ────────────────────────────────────
if (!process.env.DATABASE_URL) {
  fail("Database checks", "DATABASE_URL not set");
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tables = ["owner_settings", "owners", "clients", "form_submissions", "automations"];
    for (const table of tables) {
      await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
    }
    pass("Required DB tables exist", tables.join(", "));

    // Settings upsert + read
    await pool.query(
      `INSERT INTO owner_settings (owner_id, notification_form_submit, notification_weekly_digest, updated_at)
       VALUES ($1::uuid, false, true, NOW())
       ON CONFLICT (owner_id) DO UPDATE SET
         notification_form_submit = EXCLUDED.notification_form_submit,
         notification_weekly_digest = EXCLUDED.notification_weekly_digest,
         updated_at = NOW()`,
      [DEV_BYPASS_OWNER_ID],
    );
    const settings = await pool.query(
      `SELECT notification_form_submit, notification_weekly_digest FROM owner_settings WHERE owner_id = $1::uuid`,
      [DEV_BYPASS_OWNER_ID],
    );
    const row = settings.rows[0];
    if (!row || row.notification_form_submit !== false || row.notification_weekly_digest !== true) {
      throw new Error("settings upsert/read mismatch");
    }
    pass("Settings persist in owner_settings table");

    // Client dedup: count clients with same email for bypass owner
    const testEmail = `regression-${Date.now()}@example.com`;
    const insertClient = async () => {
      const r = await pool.query(
        `INSERT INTO clients (owner_id, full_name, email, company)
         VALUES ($1::uuid, 'Regression Test', $2, 'Test Co')
         RETURNING id`,
        [DEV_BYPASS_OWNER_ID, testEmail],
      );
      return r.rows[0].id;
    };
    const id1 = await insertClient();
    const existing = await pool.query(
      `SELECT id FROM clients WHERE owner_id = $1::uuid AND LOWER(email) = LOWER($2) LIMIT 1`,
      [DEV_BYPASS_OWNER_ID, testEmail],
    );
    if (existing.rows.length !== 1 || existing.rows[0].id !== id1) {
      throw new Error("dedup query should find exactly one client");
    }
    pass("Client email dedup query works", testEmail);

    // Cleanup regression client
    await pool.query(`DELETE FROM clients WHERE id = $1::uuid`, [id1]);

    // Dashboard metrics: clients by month
    const clients = await pool.query(
      `SELECT created_at FROM clients WHERE owner_id = $1::uuid`,
      [DEV_BYPASS_OWNER_ID],
    );
    pass("Dashboard chart data source query", `${clients.rows.length} clients for bypass owner`);
  } catch (err) {
    fail("Database checks", err.message);
  } finally {
    await pool.end();
  }
}

// ── 6. Storage module path check (intake/portal use uploadClientFile) ────────
try {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const testFile = path.join(uploadsDir, ".regression-write-test");
  await fs.writeFile(testFile, "ok");
  await fs.unlink(testFile);
  pass("Local uploads directory writable (intake/portal fallback storage)");
} catch (err) {
  fail("Local uploads directory writable", err.message);
}

// ── 7. Production preview cron 401 (if port free) ───────────────────────────
async function testProductionCron401() {
  const previewPort = 4173;
  const child = spawn("npm", ["run", "preview", "--", "--port", String(previewPort)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "production", CRON_SECRET: "regression-test-secret" },
    shell: true,
    stdio: "ignore",
  });

  try {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      try {
        const res = await fetch(`http://localhost:${previewPort}/api/cron/weekly-summary`);
        if (res.status === 401) {
          ready = true;
          pass("Production preview cron returns 401 without secret", `HTTP ${res.status}`);
          break;
        }
        if (res.status !== 404) {
          ready = true;
          fail("Production preview cron returns 401 without secret", `HTTP ${res.status}`);
          break;
        }
      } catch {
        // server still starting
      }
    }
    if (!ready) fail("Production preview cron returns 401 without secret", "preview server did not respond in time");
  } finally {
    child.kill();
  }
}

if (flags.has("--with-preview")) {
  await testProductionCron401();
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log("\n── Regression summary ──");
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`${passed}/${results.length} automated checks passed`);
if (failed.length) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
