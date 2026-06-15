import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "db", "schema.sql");

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const schema = readFileSync(schemaPath, "utf8");

/** Strip line comments so semicolons inside `-- ...` do not split statements. */
function stripLineComments(sql) {
  return sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

/** Split SQL on semicolons outside dollar-quoted blocks (e.g. DO $tag$ ... $tag$). */
function splitSqlStatements(sql) {
  const cleaned = stripLineComments(sql);
  const statements = [];
  let current = "";
  let i = 0;

  while (i < cleaned.length) {
    if (cleaned[i] === "$") {
      const tagStart = i;
      i++;
      while (i < cleaned.length && cleaned[i] !== "$") i++;
      i++;
      const tag = cleaned.slice(tagStart, i);
      const closeIdx = cleaned.indexOf(tag, i);
      if (closeIdx === -1) {
        current += cleaned.slice(tagStart);
        break;
      }
      current += cleaned.slice(tagStart, closeIdx + tag.length);
      i = closeIdx + tag.length;
      continue;
    }

    if (cleaned[i] === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0 && !trimmed.split("\n").every((line) => line.trim().startsWith("--") || line.trim() === "")) {
        statements.push(trimmed);
      }
      current = "";
      i++;
      continue;
    }

    current += cleaned[i];
    i++;
  }

  const tail = current.trim();
  if (tail.length > 0 && !tail.split("\n").every((line) => line.trim().startsWith("--") || line.trim() === "")) {
    statements.push(tail);
  }

  return statements;
}

const statements = splitSqlStatements(schema);

for (const statement of statements) {
  await pool.query(statement);
  console.log("OK:", statement.split("\n")[0].slice(0, 80));
}

// Backfill FK for databases where form_submissions existed before clients (legacy order).
try {
  await pool.query(`
    ALTER TABLE form_submissions
      ADD CONSTRAINT form_submissions_converted_client_id_fkey
      FOREIGN KEY (converted_client_id) REFERENCES clients(id) ON DELETE SET NULL
  `);
  console.log("OK: added form_submissions_converted_client_id_fkey (legacy backfill)");
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : "";
  if (code === "42710") {
    console.log("SKIP: form_submissions_converted_client_id_fkey already exists");
  } else if (code === "42P01") {
    console.log("SKIP: form_submissions table not present yet");
  } else {
    throw err;
  }
}

await pool.end();
console.log("Migration complete.");
