import { Resend } from "resend";
import fs from "node:fs/promises";
import path from "node:path";

export function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    appUrl: (process.env.VITE_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  };
}

async function simulateEmail(to: string, subject: string, html: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "emails");
  try {
    await fs.mkdir(dir, { recursive: true });
    // Sanitize subject for filename
    const safeSub = subject
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 50);
    const filename = `${Date.now()}-${safeSub}.html`;
    const destPath = path.join(dir, filename);
    const metadata = {
      to,
      subject,
      sentAt: new Date().toISOString(),
    };
    const metadataComment = `<!-- email-metadata: ${JSON.stringify(metadata)} -->\n`;
    await fs.writeFile(destPath, metadataComment + html, "utf8");
    const previewUrl = `/emails/${filename}`;
    console.log(`[Email Simulation] Sent to: ${to}`);
    console.log(`[Email Simulation] Subject: ${subject}`);
    console.log(`[Email Simulation] Preview URL: http://localhost:3000${previewUrl}`);
    return previewUrl;
  } catch (err) {
    console.error("Failed to write simulated email file:", err);
    return "";
  }
}

export async function sendFormLinkEmail(opts: {
  to: string;
  formTitle: string;
  shareUrl: string;
  senderName?: string;
  message?: string;
}) {
  const { apiKey, fromEmail, appUrl } = getEmailConfig();

  const greeting = opts.senderName ? `Hi,\n\n${opts.senderName} shared a form with you.` : "Hi,";
  const personalNote = opts.message?.trim() ? `\n\n${opts.message.trim()}` : "";
  const text = `${greeting}${personalNote}\n\nPlease complete: ${opts.formTitle}\n\n${opts.shareUrl}\n\nThanks,\nFormline`;
  const safeGreeting = escapeHtml(greeting).replace(/\n/g, "<br />");
  const safeMessage = opts.message?.trim() ? escapeHtml(opts.message.trim()) : "";
  const safeTitle = escapeHtml(opts.formTitle);
  const safeUrl = escapeHtml(opts.shareUrl);

  const htmlContent = `
    <div style="font-family: Manrope, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size: 15px; line-height: 1.6;">${safeGreeting}</p>
      ${safeMessage ? `<p style="font-size: 15px; line-height: 1.6; color: #444;">${safeMessage}</p>` : ""}
      <p style="font-size: 15px; line-height: 1.6;">Please take a moment to fill out <strong>${safeTitle}</strong>.</p>
      <p style="margin: 28px 0;">
        <a href="${safeUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">Open form</a>
      </p>
      <p style="font-size: 13px; color: #666; word-break: break-all;">${safeUrl}</p>
      <p style="font-size: 13px; color: #888; margin-top: 32px;">Sent via Formline</p>
    </div>
  `;

  // Always write simulation email log to public outbox
  const previewUrl = await simulateEmail(
    opts.to,
    `Please complete: ${opts.formTitle}`,
    htmlContent,
  );

  if (!apiKey || !fromEmail) {
    throw new Error(
      `Email is not configured. We simulated the email locally instead. You can preview it at: http://localhost:3000${previewUrl}`,
    );
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Please complete: ${opts.formTitle}`,
    text,
    html: htmlContent,
  });

  if (error) {
    const message = error.message || "Failed to send email";
    if (fromEmail.includes("@resend.dev")) {
      throw new Error(
        `Resend testing restriction: "${message}". We simulated the email locally. You can preview it at: http://localhost:3000${previewUrl}`,
      );
    }
    throw new Error(`${message}. Simulated preview created at: http://localhost:3000${previewUrl}`);
  }

  return data;
}

export async function sendSubmissionNotificationEmail(opts: {
  to: string;
  formTitle: string;
  formId: string;
  submitterName?: string;
  submitterEmail?: string;
}) {
  const { apiKey, fromEmail, appUrl } = getEmailConfig();

  const submitter = opts.submitterName
    ? `${opts.submitterName}${opts.submitterEmail ? ` (${opts.submitterEmail})` : ""}`
    : opts.submitterEmail || "Someone";

  const responsesUrl = `${appUrl}/forms/${opts.formId}`;
  const subject = `New response for: ${opts.formTitle}`;
  const text = `Hi,\n\nYou received a new response on your form "${opts.formTitle}" from ${submitter}.\n\nView the response here:\n${responsesUrl}\n\nThanks,\nFormline`;

  const htmlContent = `
    <div style="font-family: Manrope, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size: 15px; line-height: 1.6;">Hi,</p>
      <p style="font-size: 15px; line-height: 1.6;">You received a new response on your form <strong>${escapeHtml(opts.formTitle)}</strong> from <strong>${escapeHtml(submitter)}</strong>.</p>
      <p style="margin: 28px 0;">
        <a href="${escapeHtml(responsesUrl)}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">View response</a>
      </p>
      <p style="font-size: 13px; color: #666; word-break: break-all;">${escapeHtml(responsesUrl)}</p>
      <p style="font-size: 13px; color: #888; margin-top: 32px;">Sent via Formline</p>
    </div>
  `;

  // Always write simulation email log to public outbox
  await simulateEmail(opts.to, subject, htmlContent);

  if (!apiKey || !fromEmail) {
    console.warn("Email is not configured. Simulated notification locally.");
    return null;
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject,
    text,
    html: htmlContent,
  });

  if (error) {
    console.error("Failed to send submission notification email:", error.message);
  }
  return data;
}

export async function sendPortalLinkEmail(opts: {
  to: string;
  clientName: string;
  companyName: string;
  portalUrl: string;
  message?: string;
}) {
  const { apiKey, fromEmail } = getEmailConfig();
  const subject = `Your client onboarding portal link — ${opts.companyName}`;
  const personalNote = opts.message?.trim()
    ? `\n\nNote from partner:\n"${opts.message.trim()}"`
    : "";
  const text = `Hi ${opts.clientName},\n\nHere is your private, secure link to the client onboarding portal for ${opts.companyName}. You can use this portal to upload requested documents and update your contact information.${personalNote}\n\nAccess Portal: ${opts.portalUrl}\n\nThanks,\n${opts.companyName}`;

  const safeClient = escapeHtml(opts.clientName);
  const safeCompany = escapeHtml(opts.companyName);
  const safeUrl = escapeHtml(opts.portalUrl);
  const safeMessage = opts.message?.trim() ? escapeHtml(opts.message.trim()) : "";

  const htmlContent = `
    <div style="font-family: Manrope, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="font-size: 15px; line-height: 1.6;">Hi ${safeClient},</p>
      <p style="font-size: 15px; line-height: 1.6;">Here is your private, secure link to the client onboarding portal for <strong>${safeCompany}</strong>. You can use this portal to upload requested documents and update your contact information.</p>
      ${
        safeMessage
          ? `<div style="margin: 20px 0; padding: 16px; background-color: #F4F4F5; border-left: 4px solid #7C5CFF; font-style: italic; font-size: 14px; color: #444; border-radius: 4px;">"${safeMessage}"</div>`
          : ""
      }
      <p style="margin: 28px 0;">
        <a href="${safeUrl}" style="display: inline-block; background: #7C5CFF; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">Access Client Portal</a>
      </p>
      <p style="font-size: 13px; color: #666; word-break: break-all;">${safeUrl}</p>
      <p style="font-size: 13px; color: #888; margin-top: 32px;">Sent via Formline on behalf of ${safeCompany}</p>
    </div>
  `;

  // Always write simulation email log to public outbox
  const previewUrl = await simulateEmail(opts.to, subject, htmlContent);

  if (!apiKey || !fromEmail) {
    throw new Error(
      `Email is not configured. We simulated the email locally instead. You can preview it at: http://localhost:3000${previewUrl}`,
    );
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject,
    text,
    html: htmlContent,
  });

  if (error) {
    const message = error.message || "Failed to send email";
    if (fromEmail.includes("@resend.dev")) {
      throw new Error(
        `Resend testing restriction: "${message}". We simulated the email locally. You can preview it at: http://localhost:3000${previewUrl}`,
      );
    }
    throw new Error(`${message}. Simulated preview created at: http://localhost:3000${previewUrl}`);
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
