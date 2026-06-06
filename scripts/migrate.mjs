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

const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

for (const statement of statements) {
  await pool.query(statement);
  console.log("OK:", statement.split("\n")[0].slice(0, 80));
}

await pool.end();
console.log("Migration complete.");
