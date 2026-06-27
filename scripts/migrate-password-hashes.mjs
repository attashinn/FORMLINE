import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BCRYPT_COST = 12;

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Ensure owner_credentials exists (also applied via db/schema.sql on full migrate). */
const ensureTableSql = `
CREATE TABLE IF NOT EXISTS owner_credentials (
  owner_id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  hash_algorithm TEXT NOT NULL DEFAULT 'bcrypt',
  hash_cost INTEGER NOT NULL DEFAULT 12,
  needs_rehash BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owner_credentials_email_idx ON owner_credentials (email);
CREATE INDEX IF NOT EXISTS owner_credentials_needs_rehash_idx ON owner_credentials (needs_rehash);
`;

await pool.query(ensureTableSql);
console.log("OK: owner_credentials table ready");

/** Flag legacy / weak hashes for bcrypt rehash on next successful login. */
const markWeakHashes = `
UPDATE owner_credentials
SET needs_rehash = true,
    updated_at = NOW()
WHERE needs_rehash = false
  AND (
    hash_algorithm <> 'bcrypt'
    OR hash_cost < $1
    OR password_hash NOT LIKE '$2%'
    OR password_hash ~ '^[a-f0-9]{32}$'
    OR password_hash ~ '^[a-f0-9]{40}$'
    OR password_hash ~ '^[a-f0-9]{64}$'
    OR (length(password_hash) < 60 AND password_hash NOT LIKE '$2%')
  )
RETURNING owner_id, email, hash_algorithm, hash_cost;
`;

const { rows: flagged } = await pool.query(markWeakHashes, [BCRYPT_COST]);
console.log(`OK: marked ${flagged.length} credential(s) for rehash on next login`);
for (const row of flagged) {
  console.log(`  - owner ${row.owner_id} (${row.hash_algorithm}, cost ${row.hash_cost})`);
}

/** Clerk-only accounts (no local row) are migrated automatically on next login in auth.server.ts. */
const { rows: ownersWithoutCredentials } = await pool.query(`
  SELECT o.owner_id, o.email
  FROM owners o
  LEFT JOIN owner_credentials c ON c.owner_id = o.owner_id
  WHERE c.owner_id IS NULL
`);

console.log(
  `INFO: ${ownersWithoutCredentials.length} owner(s) without local bcrypt hash — will migrate on next login`,
);

await pool.end();
console.log("Password hash migration complete.");
