import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const statements = [
  "ALTER TABLE client_files ADD COLUMN IF NOT EXISTS url TEXT;",
  "ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE;",
  `CREATE TABLE IF NOT EXISTS client_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  "CREATE INDEX IF NOT EXISTS client_tasks_client_id_idx ON client_tasks (client_id);",
  `CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'Untitled Automation',
    description TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT false,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    connections JSONB NOT NULL DEFAULT '[]'::jsonb,
    runs INTEGER NOT NULL DEFAULT 0,
    last_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  "CREATE INDEX IF NOT EXISTS automations_owner_id_idx ON automations (owner_id);",
  "CREATE INDEX IF NOT EXISTS automations_owner_enabled_idx ON automations (owner_id, enabled);",
];

console.log("Starting Step 3 migrations...");

for (const statement of statements) {
  try {
    await pool.query(statement);
    console.log("OK:", statement.split("\n")[0].trim().slice(0, 80));
  } catch (error) {
    console.error("ERROR running statement:", statement);
    console.error(error);
  }
}

await pool.end();
console.log("Migration complete.");
