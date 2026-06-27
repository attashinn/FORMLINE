import bcrypt from "bcryptjs";
import crypto from "node:crypto";

/** Minimum bcrypt cost factor (2^12 iterations). */
export const BCRYPT_COST = 12;

export type LegacyPasswordFormat = "bcrypt" | "md5" | "sha1" | "sha256" | "plaintext" | "unknown";

export type PasswordVerifyResult = {
  valid: boolean;
  /** When set, caller must persist this bcrypt hash (legacy or weak-cost upgrade). */
  upgradedHash: string | null;
};

export function detectPasswordFormat(stored: string): LegacyPasswordFormat {
  if (/^\$2[aby]\$\d{2}\$/.test(stored)) return "bcrypt";
  if (/^[a-f0-9]{32}$/i.test(stored)) return "md5";
  if (/^[a-f0-9]{40}$/i.test(stored)) return "sha1";
  if (/^[a-f0-9]{64}$/i.test(stored)) return "sha256";
  if (stored.length > 0 && stored.length < 60) return "plaintext";
  return "unknown";
}

export function getBcryptCost(hash: string): number | null {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(hash);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function bcryptNeedsRehash(hash: string): boolean {
  const cost = getBcryptCost(hash);
  return cost === null || cost < BCRYPT_COST;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/** Verify a bcrypt hash. Uses bcrypt.compare (constant-time). */
export async function verifyBcryptPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) {
    crypto.timingSafeEqual(leftBuf, leftBuf);
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function timingSafeEqualHex(left: string, right: string): boolean {
  try {
    const leftBuf = Buffer.from(left.toLowerCase(), "hex");
    const rightBuf = Buffer.from(right.toLowerCase(), "hex");
    if (leftBuf.length !== rightBuf.length) {
      crypto.timingSafeEqual(leftBuf, leftBuf);
      return false;
    }
    return crypto.timingSafeEqual(leftBuf, rightBuf);
  } catch {
    return false;
  }
}

async function verifyLegacyPassword(
  plaintext: string,
  stored: string,
  format: LegacyPasswordFormat,
): Promise<boolean> {
  switch (format) {
    case "md5":
      return timingSafeEqualHex(crypto.createHash("md5").update(plaintext).digest("hex"), stored);
    case "sha1":
      return timingSafeEqualHex(crypto.createHash("sha1").update(plaintext).digest("hex"), stored);
    case "sha256":
      return timingSafeEqualHex(
        crypto.createHash("sha256").update(plaintext).digest("hex"),
        stored,
      );
    case "plaintext":
      return timingSafeEqualString(plaintext, stored);
    default:
      return false;
  }
}

/**
 * Verify a stored password and return an upgraded bcrypt hash when the stored
 * format is legacy/weak. Never logs or returns the plaintext password.
 */
export async function verifyAndUpgradePassword(
  plaintext: string,
  stored: string,
): Promise<PasswordVerifyResult> {
  const format = detectPasswordFormat(stored);

  if (format === "bcrypt") {
    const valid = await verifyBcryptPassword(plaintext, stored);
    if (!valid) return { valid: false, upgradedHash: null };
    if (bcryptNeedsRehash(stored)) {
      return { valid: true, upgradedHash: await hashPassword(plaintext) };
    }
    return { valid: true, upgradedHash: null };
  }

  const valid = await verifyLegacyPassword(plaintext, stored, format);
  if (!valid) return { valid: false, upgradedHash: null };
  return { valid: true, upgradedHash: await hashPassword(plaintext) };
}
