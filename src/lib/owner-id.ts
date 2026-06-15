import crypto from "node:crypto";

/** Map a Clerk user id to a stable, valid UUID v4 for Postgres owner_id columns. */
export function getDeterministicUuid(str: string): string {
  const hash = crypto.createHash("md5").update(str).digest("hex");
  const variant = ((parseInt(hash[15], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(12, 15)}-${variant}${hash.slice(16, 19)}-${hash.slice(19, 31)}`;
}
