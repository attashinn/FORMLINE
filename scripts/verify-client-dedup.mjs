/**
 * Run: node scripts/verify-client-dedup.mjs
 *
 * Mirrors isDedupableEmail() in src/lib/clients.server.ts — keep in sync.
 * Dedup: same owner + case-insensitive email reuses client; placeholder emails never dedupe.
 */

const PLACEHOLDER_EMAIL = "no-email@example.com";

function isDedupableEmail(email) {
  if (!email || !email.trim()) return false;
  return email.trim().toLowerCase() !== PLACEHOLDER_EMAIL;
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

assert(isDedupableEmail("client@example.com") === true, "real email dedupes");
assert(isDedupableEmail("Client@Example.com") === true, "case ignored at query time");
assert(isDedupableEmail("no-email@example.com") === false, "placeholder skips dedup");
assert(isDedupableEmail("") === false, "empty skips dedup");
assert(isDedupableEmail(null) === false, "null skips dedup");

console.log("client dedup rules: OK");
