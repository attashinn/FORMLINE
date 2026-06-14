/**
 * Quick Resend delivery test.
 * Sends a test email using your live RESEND_API_KEY + RESEND_FROM_EMAIL.
 *
 * Usage:
 *   node --env-file=.env scripts/test-resend-verified.mjs
 *
 * Set TEST_EMAIL to the address you want the test delivered to:
 *   TEST_EMAIL=you@example.com node --env-file=.env scripts/test-resend-verified.mjs
 */

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
// Override destination with TEST_EMAIL or fall back to the from-address domain
const toEmail = process.env.TEST_EMAIL || fromEmail;

if (!apiKey || !fromEmail) {
  console.error("❌  Missing RESEND_API_KEY or RESEND_FROM_EMAIL in .env");
  process.exit(1);
}

console.log(`\n📧  Sending test email`);
console.log(`    From : ${fromEmail}`);
console.log(`    To   : ${toEmail}`);
console.log(`    Key  : ${apiKey.slice(0, 8)}…\n`);

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from: fromEmail,
  to: toEmail,
  subject: "✅ Resend test — Formline portal email",
  html: `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:8px">🎉 Resend is working!</h2>
      <p style="color:#444">Your Formline installation can now send portal link emails to clients.</p>
      <p style="margin-top:24px;font-size:13px;color:#888">Sent via Formline · test-resend-verified.mjs</p>
    </div>
  `,
});

if (error) {
  console.error("❌  Resend API error:", error);
  process.exit(1);
}

console.log("✅  Email accepted by Resend!");
console.log("    Message ID:", data?.id);
console.log("\nCheck your inbox (and spam folder) at:", toEmail, "\n");
