import { Resend } from "resend";

export function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    appUrl: (process.env.VITE_PUBLIC_APP_URL ?? "https://formline.brnnd.com").replace(/\/$/, ""),
  };
}

export async function sendFormLinkEmail(opts: {
  to: string;
  formTitle: string;
  shareUrl: string;
  senderName?: string;
  message?: string;
}) {
  const { apiKey, fromEmail } = getEmailConfig();
  if (!apiKey || !fromEmail) {
    throw new Error("Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const resend = new Resend(apiKey);
  const greeting = opts.senderName ? `Hi,\n\n${opts.senderName} shared a form with you.` : "Hi,";
  const personalNote = opts.message?.trim() ? `\n\n${opts.message.trim()}` : "";
  const text = `${greeting}${personalNote}\n\nPlease complete: ${opts.formTitle}\n\n${opts.shareUrl}\n\nThanks,\nFormline`;
  const safeGreeting = escapeHtml(greeting).replace(/\n/g, "<br />");
  const safeMessage = opts.message?.trim() ? escapeHtml(opts.message.trim()) : "";
  const safeTitle = escapeHtml(opts.formTitle);
  const safeUrl = escapeHtml(opts.shareUrl);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Please complete: ${opts.formTitle}`,
    text,
    html: `
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
    `,
  });

  if (error) {
    const message = error.message || "Failed to send email";
    if (fromEmail.includes("@resend.dev")) {
      throw new Error(
        "Resend is still using its testing sender. Verify a domain in Resend, then set RESEND_FROM_EMAIL to something like Formline <forms@yourdomain.com>.",
      );
    }
    throw new Error(message);
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
