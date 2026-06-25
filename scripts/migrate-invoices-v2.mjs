import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const migrations = [
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS send_at TIMESTAMPTZ`,
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ`,
];

for (const stmt of migrations) {
  try {
    await sql.unsafe(stmt);
    console.log("OK:", stmt.slice(0, 80));
  } catch (err) {
    if (err?.code === "42701") {
      console.log("SKIP (already exists):", stmt.slice(0, 80));
    } else {
      throw err;
    }
  }
}

console.log("Invoice v2 migration complete.");
