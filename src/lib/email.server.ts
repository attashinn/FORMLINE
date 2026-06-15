import { Resend } from "resend";
import fs from "node:fs/promises";
import path from "node:path";

export type EmailOutboxDelivery = "simulated" | "resend";

export type EmailOutboxMetadata = {
  to: string;
  subject: string;
  sentAt: string;
  resendId: string | null;
  success: boolean;
  delivery: EmailOutboxDelivery;
};

export function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    appUrl: (process.env.VITE_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  };
}

export function isResendConfigured() {
  const { apiKey, fromEmail } = getEmailConfig();
  return Boolean(apiKey && fromEmail);
}

const OUTBOX_DIR = path.join(process.cwd(), "public", "emails");

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOutboxBasename(subject: string) {
  const safeSub = subject
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 50);
  return `${Date.now()}-${safeSub}`;
}

async function writeOutboxFiles(basename: string, html: string, metadata: EmailOutboxMetadata) {
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  const htmlPath = path.join(OUTBOX_DIR, `${basename}.html`);
  const jsonPath = path.join(OUTBOX_DIR, `${basename}.json`);
  const metadataComment = `<!-- email-metadata: ${JSON.stringify(metadata)} -->\n`;
  await fs.writeFile(htmlPath, metadataComment + html, "utf8");
  await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2), "utf8");
}

/** Log outbound email HTML + metadata to public/emails for the outbox UI. */
async function logEmailToOutbox(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{
  filename: string;
  previewUrl: string;
  updateMetadata: (patch: Partial<EmailOutboxMetadata>) => Promise<void>;
}> {
  const sentAt = new Date().toISOString();
  const basename = buildOutboxBasename(opts.subject);
  const filename = `${basename}.html`;

  const metadata: EmailOutboxMetadata = {
    to: opts.to,
    subject: opts.subject,
    sentAt,
    resendId: null,
    success: false,
    delivery: "simulated",
  };

  await writeOutboxFiles(basename, opts.html, metadata);

  const updateMetadata = async (patch: Partial<EmailOutboxMetadata>) => {
    const next: EmailOutboxMetadata = { ...metadata, ...patch };
    Object.assign(metadata, next);
    await writeOutboxFiles(basename, opts.html, next);
  };

  const previewUrl = `/emails/${filename}`;
  console.log(`[Email Outbox] Logged to ${previewUrl} (to: ${opts.to}, subject: ${opts.subject})`);

  return { filename, previewUrl, updateMetadata };
}

async function finalizeResendDelivery(
  updateMetadata: (patch: Partial<EmailOutboxMetadata>) => Promise<void>,
  result: { data: { id: string } | null; error: { message: string } | null },
) {
  if (result.error || !result.data?.id) {
    await updateMetadata({
      success: false,
      delivery: "simulated",
      resendId: null,
    });
    return { ok: false as const, error: result.error };
  }

  await updateMetadata({
    success: true,
    delivery: "resend",
    resendId: result.data.id,
  });
  return { ok: true as const, data: result.data };
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

  const subject = `Please complete: ${opts.formTitle}`;
  const { previewUrl, updateMetadata } = await logEmailToOutbox({
    to: opts.to,
    subject,
    html: htmlContent,
  });

  if (!apiKey || !fromEmail) {
    throw new Error(
      `Email is not configured. We simulated the email locally instead. You can preview it at: ${appUrl}${previewUrl}`,
    );
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject,
    text,
    html: htmlContent,
  });

  const finalized = await finalizeResendDelivery(updateMetadata, result);

  if (!finalized.ok) {
    const message = finalized.error?.message || "Failed to send email";
    if (fromEmail.includes("@resend.dev")) {
      throw new Error(
        `Resend testing restriction: "${message}". We simulated the email locally. You can preview it at: ${appUrl}${previewUrl}`,
      );
    }
    throw new Error(`${message}. Simulated preview created at: ${appUrl}${previewUrl}`);
  }

  return finalized.data;
}

export async function sendSubmissionNotificationEmail(opts: {
  to: string;
  formTitle: string;
  formId: string;
  submitterName?: string;
  submitterEmail?: string;
}) {
  const { apiKey, fromEmail } = getEmailConfig();

  const submitter = opts.submitterName
    ? `${opts.submitterName}${opts.submitterEmail ? ` (${opts.submitterEmail})` : ""}`
    : opts.submitterEmail || "Someone";

  const responsesUrl = `${getEmailConfig().appUrl}/forms/${opts.formId}`;
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

  const { updateMetadata } = await logEmailToOutbox({
    to: opts.to,
    subject,
    html: htmlContent,
  });

  if (!apiKey || !fromEmail) {
    console.warn("Email is not configured. Simulated notification locally.");
    return null;
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject,
    text,
    html: htmlContent,
  });

  const finalized = await finalizeResendDelivery(updateMetadata, result);
  if (!finalized.ok) {
    console.error("Failed to send submission notification email:", finalized.error?.message);
  }
  return finalized.ok ? finalized.data : null;
}

export async function sendPortalLinkEmail(opts: {
  to: string;
  clientName: string;
  companyName: string;
  portalUrl: string;
  message?: string;
}) {
  const { apiKey, fromEmail, appUrl } = getEmailConfig();
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

  const { previewUrl, updateMetadata } = await logEmailToOutbox({
    to: opts.to,
    subject,
    html: htmlContent,
  });

  if (!apiKey || !fromEmail) {
    throw new Error(
      `Email is not configured. We simulated the email locally instead. You can preview it at: ${appUrl}${previewUrl}`,
    );
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject,
    text,
    html: htmlContent,
  });

  const finalized = await finalizeResendDelivery(updateMetadata, result);

  if (!finalized.ok) {
    const message = finalized.error?.message || "Failed to send email";
    if (fromEmail.includes("@resend.dev")) {
      throw new Error(
        `Resend testing restriction: "${message}". We simulated the email locally. You can preview it at: ${appUrl}${previewUrl}`,
      );
    }
    throw new Error(`${message}. Simulated preview created at: ${appUrl}${previewUrl}`);
  }

  return finalized.data;
}

export async function sendAutomationEmail(opts: {
  to: string;
  subject: string;
  body: string;
}) {
  const { apiKey, fromEmail } = getEmailConfig();
  const text = opts.body;
  const htmlContent = `
    <div style="font-family: Manrope, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111; white-space: pre-wrap;">${escapeHtml(opts.body)}</div>
  `;

  const { previewUrl, updateMetadata } = await logEmailToOutbox({
    to: opts.to,
    subject: opts.subject,
    html: htmlContent,
  });

  if (!apiKey || !fromEmail) {
    console.warn("Email is not configured. Simulated automation email locally.");
    return { simulated: true, previewUrl };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: opts.subject,
    text,
    html: htmlContent,
  });

  const finalized = await finalizeResendDelivery(updateMetadata, result);
  if (!finalized.ok) {
    console.error("Failed to send automation email:", finalized.error?.message);
    throw new Error(finalized.error?.message || "Failed to send automation email");
  }

  return finalized.data;
}

/** Read sidecar JSON metadata for an outbox HTML file (server-only). */
export async function readOutboxMetadata(filename: string): Promise<EmailOutboxMetadata | null> {
  const base = path.basename(filename).replace(/\.html$/, "");
  const jsonPath = path.join(OUTBOX_DIR, `${base}.json`);
  try {
    const raw = await fs.readFile(jsonPath, "utf8");
    return JSON.parse(raw) as EmailOutboxMetadata;
  } catch {
    return null;
  }
}

function parseLegacyHtmlMetadata(html: string): EmailOutboxMetadata | null {
  const metadataMatch = html.match(/<!-- email-metadata: (\{.*?\}) -->/);
  if (!metadataMatch) return null;
  try {
    const meta = JSON.parse(metadataMatch[1]) as Partial<EmailOutboxMetadata>;
    return {
      to: String(meta.to ?? ""),
      subject: String(meta.subject ?? ""),
      sentAt: String(meta.sentAt ?? new Date().toISOString()),
      resendId: meta.resendId ? String(meta.resendId) : null,
      success: Boolean(meta.success),
      delivery: meta.delivery === "resend" ? "resend" : "simulated",
    };
  } catch {
    return null;
  }
}

export type EmailOutboxListItem = {
  filename: string;
  to: string;
  subject: string;
  sentAt: string;
  previewUrl: string;
  resendId: string | null;
  success: boolean;
  delivery: EmailOutboxDelivery;
};

export async function listOutboxEmails(): Promise<{
  items: EmailOutboxListItem[];
  resendConfigured: boolean;
}> {
  try {
    const files = await fs.readdir(OUTBOX_DIR);
    const list: EmailOutboxListItem[] = [];

    for (const file of files) {
      if (!file.endsWith(".html")) continue;
      const filePath = path.join(OUTBOX_DIR, file);
      const sidecar = await readOutboxMetadata(file);

      if (sidecar) {
        list.push({
          filename: file,
          to: sidecar.to,
          subject: sidecar.subject,
          sentAt: sidecar.sentAt,
          previewUrl: `/emails/${file}`,
          resendId: sidecar.resendId,
          success: sidecar.success,
          delivery: sidecar.delivery,
        });
        continue;
      }

      const html = await fs.readFile(filePath, "utf8");
      const legacy = parseLegacyHtmlMetadata(html);
      if (legacy) {
        list.push({
          filename: file,
          to: legacy.to,
          subject: legacy.subject,
          sentAt: legacy.sentAt,
          previewUrl: `/emails/${file}`,
          resendId: legacy.resendId,
          success: legacy.success,
          delivery: legacy.delivery,
        });
        continue;
      }

      const parts = file.split("-");
      const timestamp = parseInt(parts[0], 10);
      const sentAt = Number.isNaN(timestamp)
        ? new Date().toISOString()
        : new Date(timestamp).toISOString();
      const subjectRaw = parts.slice(1).join("-").replace(".html", "");
      const subject = subjectRaw
        ? subjectRaw.charAt(0).toUpperCase() + subjectRaw.slice(1).replace(/-/g, " ")
        : "Outbound email";

      list.push({
        filename: file,
        to: "unknown@example.com",
        subject,
        sentAt,
        previewUrl: `/emails/${file}`,
        resendId: null,
        success: false,
        delivery: "simulated",
      });
    }

    return {
      items: list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
      resendConfigured: isResendConfigured(),
    };
  } catch {
    return { items: [], resendConfigured: isResendConfigured() };
  }
}

export async function deleteOutboxEmail(filename: string) {
  const base = path.basename(filename).replace(/\.html$/, "");
  const htmlPath = path.join(OUTBOX_DIR, `${base}.html`);
  const jsonPath = path.join(OUTBOX_DIR, `${base}.json`);
  await fs.unlink(htmlPath);
  try {
    await fs.unlink(jsonPath);
  } catch {
    // sidecar may not exist for legacy entries
  }
}
