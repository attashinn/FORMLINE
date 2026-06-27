import { sql } from "@/lib/db.server";
import {
  BCRYPT_COST,
  detectPasswordFormat,
  hashPassword,
  verifyAndUpgradePassword,
} from "@/lib/password.server";

export type OwnerCredentials = {
  ownerId: string;
  email: string;
  passwordHash: string;
  hashAlgorithm: string;
  hashCost: number;
  needsRehash: boolean;
};

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function mapCredentialsRow(row: Record<string, unknown>): OwnerCredentials {
  return {
    ownerId: String(row.owner_id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    hashAlgorithm: String(row.hash_algorithm),
    hashCost: Number(row.hash_cost ?? BCRYPT_COST),
    needsRehash: Boolean(row.needs_rehash),
  };
}

export async function getCredentialsByEmail(email: string): Promise<OwnerCredentials | null> {
  const normalized = normalizeEmail(email);
  const rows = await sql`
    SELECT owner_id, email, password_hash, hash_algorithm, hash_cost, needs_rehash
    FROM owner_credentials
    WHERE email = ${normalized}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return mapCredentialsRow(rows[0] as Record<string, unknown>);
}

export async function upsertCredentials(opts: {
  ownerId: string;
  email: string;
  passwordHash: string;
  needsRehash?: boolean;
}): Promise<void> {
  const normalized = normalizeEmail(opts.email);
  const format = detectPasswordFormat(opts.passwordHash);
  const hashCost =
    format === "bcrypt" ? (getBcryptCostFromHash(opts.passwordHash) ?? BCRYPT_COST) : BCRYPT_COST;

  await sql`
    INSERT INTO owner_credentials (
      owner_id,
      email,
      password_hash,
      hash_algorithm,
      hash_cost,
      needs_rehash,
      updated_at
    )
    VALUES (
      ${opts.ownerId}::uuid,
      ${normalized},
      ${opts.passwordHash},
      ${format === "bcrypt" ? "bcrypt" : "legacy"},
      ${hashCost},
      ${opts.needsRehash ?? false},
      NOW()
    )
    ON CONFLICT (owner_id) DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      hash_algorithm = EXCLUDED.hash_algorithm,
      hash_cost = EXCLUDED.hash_cost,
      needs_rehash = EXCLUDED.needs_rehash,
      updated_at = NOW()
  `;
}

function getBcryptCostFromHash(hash: string): number | null {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(hash);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** Hash plaintext with bcrypt and persist. Used on signup and password change. */
export async function setPasswordForOwner(opts: {
  ownerId: string;
  email: string;
  plaintext: string;
}): Promise<void> {
  const passwordHash = await hashPassword(opts.plaintext);
  await upsertCredentials({
    ownerId: opts.ownerId,
    email: opts.email,
    passwordHash,
    needsRehash: false,
  });
}

/** Verify against stored hash; re-hash legacy/weak entries on successful login. */
export async function verifyOwnerPassword(
  email: string,
  plaintext: string,
): Promise<{ valid: boolean; ownerId: string | null; migrated: boolean }> {
  const credentials = await getCredentialsByEmail(email);
  if (!credentials) {
    return { valid: false, ownerId: null, migrated: false };
  }

  const { valid, upgradedHash } = await verifyAndUpgradePassword(
    plaintext,
    credentials.passwordHash,
  );
  if (!valid) {
    return { valid: false, ownerId: credentials.ownerId, migrated: false };
  }

  if (upgradedHash || credentials.needsRehash) {
    const nextHash = upgradedHash ?? (await hashPassword(plaintext));
    await upsertCredentials({
      ownerId: credentials.ownerId,
      email: credentials.email,
      passwordHash: nextHash,
      needsRehash: false,
    });
    return { valid: true, ownerId: credentials.ownerId, migrated: Boolean(upgradedHash) };
  }

  return { valid: true, ownerId: credentials.ownerId, migrated: false };
}

/** Store bcrypt hash after Clerk-only account authenticates (migration on login). */
export async function migrateClerkPasswordOnLogin(opts: {
  ownerId: string;
  email: string;
  plaintext: string;
}): Promise<void> {
  await setPasswordForOwner(opts);
  console.info("[auth] Migrated account to bcrypt password storage", {
    ownerId: opts.ownerId,
    emailHash: normalizeEmail(opts.email).slice(0, 3) + "***",
  });
}

export async function markCredentialsForRehash(ownerId: string): Promise<void> {
  await sql`
    UPDATE owner_credentials
    SET needs_rehash = true, updated_at = NOW()
    WHERE owner_id = ${ownerId}::uuid
  `;
}

export async function listCredentialsNeedingRehash(): Promise<OwnerCredentials[]> {
  const rows = await sql`
    SELECT owner_id, email, password_hash, hash_algorithm, hash_cost, needs_rehash
    FROM owner_credentials
    WHERE needs_rehash = true
       OR hash_algorithm <> 'bcrypt'
       OR hash_cost < ${BCRYPT_COST}
       OR password_hash NOT LIKE '$2%'
  `;
  return rows.map((row) => mapCredentialsRow(row as Record<string, unknown>));
}
