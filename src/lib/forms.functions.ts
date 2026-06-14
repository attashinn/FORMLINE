import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import {
  getEmailConfig,
  sendFormLinkEmail as deliverFormLinkEmail,
  sendSubmissionNotificationEmail,
} from "./email.server";
import type { FieldType, FormField, FormRecord, SubmissionRecord, SubmissionStatus } from "./forms.types";

/** Map a Clerk user id to a stable, valid UUID v4 for Postgres. */
function getDeterministicUuid(str: string): string {
  const hash = crypto.createHash("md5").update(str).digest("hex");
  const variant = ((parseInt(hash[15], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(12, 15)}-${variant}${hash.slice(16, 19)}-${hash.slice(19, 31)}`;
}

export const requireClerkAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  if (process.env.NODE_ENV === "development") {
    try {
      const { getRequestUrl, getCookie } = await import("@tanstack/react-start/server");
      const url = getRequestUrl();
      const bypassCookie = getCookie("bypass");
      if (url.searchParams.get("bypass") === "true" || bypassCookie === "true") {
        const mockUserId = "00000000-0000-0000-0000-000000000000";
        return next({
          context: {
            userId: mockUserId,
            clerkUserId: "mock_clerk_user",
          },
        });
      }
    } catch (e) {
      console.warn("Failed to get request context inside requireClerkAuth:", e);
    }
  }
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: Not logged in");
  }
  const mappedUuid = getDeterministicUuid(userId);
  return next({
    context: {
      userId: mappedUuid,
      clerkUserId: userId,
    },
  });
});

const FieldSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["text", "email", "textarea", "select", "checkbox", "date", "number", "tel"]),
  label: z.string().min(1).max(200),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().min(1).max(200)).max(50).optional(),
});

function parseFields(raw: unknown): FormField[] {
  if (Array.isArray(raw)) return raw as FormField[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as FormField[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeFormRecord(row: Record<string, unknown>): FormRecord {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    fields: parseFields(row.fields),
    share_token: String(row.share_token),
    is_published: Boolean(row.is_published),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const listForms = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT * FROM forms
      WHERE owner_id = ${context.userId}::uuid
      ORDER BY updated_at DESC
    `;
    return rows.map((row) => normalizeFormRecord(row as Record<string, unknown>));
  });

export const getForm = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const forms = await sql`
      SELECT * FROM forms
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (forms.length === 0) throw new Error("Not found");
    const form = normalizeFormRecord(forms[0] as Record<string, unknown>);

    const submissions = await sql`
      SELECT * FROM form_submissions
      WHERE form_id = ${data.id}
      ORDER BY submitted_at DESC
    `;
    return {
      form,
      submissions: submissions as unknown as SubmissionRecord[],
    };
  });

export const createForm = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { title: string; description?: string; fields: FormField[] }) =>
    z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        fields: z.array(FieldSchema).max(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const rows = await sql`
      INSERT INTO forms (owner_id, title, description, fields)
      VALUES (${context.userId}::uuid, ${data.title}, ${data.description ?? null}, ${JSON.stringify(data.fields)}::jsonb)
      RETURNING *
    `;
    return normalizeFormRecord(rows[0] as Record<string, unknown>);
  });

export const updateForm = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(
    (d: {
      id: string;
      title: string;
      description?: string;
      fields: FormField[];
      is_published: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          title: z.string().min(1).max(200),
          description: z.string().max(1000).optional(),
          fields: z.array(FieldSchema).max(50),
          is_published: z.boolean(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const rows = await sql`
      UPDATE forms
      SET title = ${data.title},
          description = ${data.description ?? null},
          fields = ${JSON.stringify(data.fields)}::jsonb,
          is_published = ${data.is_published},
          updated_at = NOW()
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      RETURNING *
    `;
    if (rows.length === 0) throw new Error("Not found or unauthorized");
    return normalizeFormRecord(rows[0] as Record<string, unknown>);
  });

export const deleteForm = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      DELETE FROM forms
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      RETURNING id
    `;
    if (rows.length === 0) throw new Error("Not found or unauthorized");
    return { ok: true };
  });

export const deleteSubmission = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const subs = await sql`
      SELECT form_id FROM form_submissions
      WHERE id = ${data.id}
      LIMIT 1
    `;
    if (subs.length === 0) throw new Error("Submission not found");
    const sub = subs[0];

    const forms = await sql`
      SELECT id FROM forms
      WHERE id = ${sub.form_id} AND owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (forms.length === 0) throw new Error("Unauthorized");

    await sql`
      DELETE FROM form_submissions
      WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const sendFormLinkEmail = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { formId: string; to: string; message?: string }) =>
    z
      .object({
        formId: z.string().uuid(),
        to: z.string().email().max(255),
        message: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const forms = await sql`
      SELECT title, share_token, is_published FROM forms
      WHERE id = ${data.formId} AND owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (forms.length === 0) throw new Error("Form not found");
    const form = forms[0];
    if (!form.is_published) throw new Error("Publish the form before emailing it to a client");

    const { appUrl } = getEmailConfig();
    const shareUrl = `${appUrl}/f/${form.share_token}`;
    const user = await clerkClient().users.getUser(context.clerkUserId);
    const senderName = user.fullName || user.primaryEmailAddress?.emailAddress || undefined;

    const email = await deliverFormLinkEmail({
      to: data.to,
      formTitle: form.title,
      shareUrl,
      senderName,
      message: data.message,
    });

    return { ok: true, emailId: email?.id };
  });

// Public — no auth. Used by the public share page.
export const getPublicForm = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) =>
    z
      .object({
        token: z
          .string()
          .min(8)
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const forms = await sql`
      SELECT id, title, description, fields, is_published, share_token FROM forms
      WHERE share_token = ${data.token}
      LIMIT 1
    `;
    if (forms.length === 0) return null;
    const form = forms[0];
    if (!form.is_published) return null;
    return form as unknown as Pick<
      FormRecord,
      "id" | "title" | "description" | "fields" | "is_published" | "share_token"
    >;
  });

export const submitPublicForm = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      token: string;
      data: Record<string, unknown>;
      submitter_name?: string;
      submitter_email?: string;
    }) =>
      z
        .object({
          token: z
            .string()
            .min(8)
            .max(64)
            .regex(/^[a-zA-Z0-9_-]+$/),
          data: z.record(z.string(), z.unknown()),
          submitter_name: z.string().max(200).optional(),
          submitter_email: z.string().email().max(255).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const forms = await sql`
      SELECT id, is_published, title, owner_id FROM forms
      WHERE share_token = ${data.token}
      LIMIT 1
    `;
    if (forms.length === 0) throw new Error("Form unavailable");
    const form = forms[0];
    if (!form.is_published) throw new Error("Form unavailable");

    await sql`
      INSERT INTO form_submissions (form_id, data, submitter_name, submitter_email)
      VALUES (${form.id}, ${JSON.stringify(data.data)}::jsonb, ${data.submitter_name ?? null}, ${data.submitter_email ?? null})
    `;

    try {
      const userListResult = await clerkClient().users.getUserList();
      const users = Array.isArray(userListResult) ? userListResult : userListResult.data || [];
      const ownerUser = users.find((u) => getDeterministicUuid(u.id) === form.owner_id);
      const ownerEmail = ownerUser?.primaryEmailAddress?.emailAddress;

      if (ownerEmail) {
        await sendSubmissionNotificationEmail({
          to: ownerEmail,
          formTitle: form.title,
          formId: form.id,
          submitterName: data.submitter_name,
          submitterEmail: data.submitter_email,
        });
      } else {
        console.warn(`Owner email not found for form owner UUID: ${form.owner_id}`);
      }
    } catch (emailErr) {
      console.error("Failed to notify form owner of new submission:", emailErr);
    }

    return { ok: true };
  });

export const updateSubmissionStatus = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string; status: SubmissionStatus }) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["New", "Reviewed", "Converted", "Archived"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const subs = await sql`
      SELECT fs.id, fs.form_id, f.owner_id
      FROM form_submissions fs
      JOIN forms f ON fs.form_id = f.id
      WHERE fs.id = ${data.id} AND f.owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (subs.length === 0) throw new Error("Submission not found or unauthorized");

    const rows = await sql`
      UPDATE form_submissions
      SET status = ${data.status}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return rows[0] as unknown as SubmissionRecord;
  });

export const convertSubmissionToClient = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      SELECT fs.*, f.title as form_title, f.fields as form_fields, f.owner_id as form_owner_id
      FROM form_submissions fs
      JOIN forms f ON fs.form_id = f.id
      WHERE fs.id = ${data.id} AND f.owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("Submission not found or unauthorized");
    const sub = rows[0];

    if (sub.converted_client_id) {
      return { ok: true, clientId: String(sub.converted_client_id) };
    }

    const dataObj = (sub.data || {}) as Record<string, unknown>;
    const fieldsList = (sub.form_fields || []) as FormField[];

    const getValueByMatch = (keys: string[], types: FieldType[] = []) => {
      const field = fieldsList.find(
        (f) => types.includes(f.type) || keys.some((k) => f.label.toLowerCase().includes(k)),
      );
      if (field && dataObj[field.id] !== undefined) {
        return String(dataObj[field.id]);
      }
      for (const key of Object.keys(dataObj)) {
        if (keys.some((k) => key.toLowerCase().includes(k))) {
          return String(dataObj[key]);
        }
      }
      return "";
    };

    const fullName =
      sub.submitter_name || getValueByMatch(["full name", "client name", "name"], ["text"]);
    const email = sub.submitter_email || getValueByMatch(["email", "email address"], ["email"]);
    const phone = getValueByMatch(["phone", "tel", "mobile", "telephone"], ["tel"]);
    const company = getValueByMatch(["company", "business", "organization"], ["text"]);
    const industry = getValueByMatch(["industry"], ["text"]);
    const website = getValueByMatch(["website", "url", "site"], ["text"]);
    const location = getValueByMatch(["location", "address", "city", "state", "country"], ["text"]);
    const companySize = getValueByMatch(["size", "company size", "employees"], ["text", "number"]);
    const styleReferences = getValueByMatch(
      ["style", "reference", "inspiration"],
      ["text", "textarea"],
    );
    const goals = getValueByMatch(
      ["goals", "objective", "expectations", "project goals", "description"],
      ["text", "textarea"],
    );
    const budget = getValueByMatch(["budget", "cost", "price"], ["text", "number"]);
    const deadline = getValueByMatch(["deadline", "timeline", "date", "due"], ["date", "text"]);

    let brandColors: string[] = [];
    const colorsVal = getValueByMatch(["colors", "brand colors"]);
    if (colorsVal) {
      brandColors = colorsVal
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }

    let services: string[] = [];
    const servicesVal = getValueByMatch(
      ["services", "interest", "help", "need"],
      ["select", "checkbox"],
    );
    if (servicesVal) {
      services = servicesVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    let notesText = `Converted from form response: "${sub.form_title}" submitted at ${new Date(sub.submitted_at).toLocaleString()}.\n\n`;
    for (const f of fieldsList) {
      const ans = dataObj[f.id];
      const ansStr =
        ans === undefined || ans === null ? "—" : Array.isArray(ans) ? ans.join(", ") : String(ans);
      notesText += `• ${f.label}: ${ansStr}\n`;
    }

    const clientRows = await sql`
      INSERT INTO clients (
        owner_id,
        full_name,
        email,
        phone,
        company,
        industry,
        website,
        location,
        company_size,
        brand_colors,
        style_references,
        goals,
        budget,
        deadline,
        services,
        status
      )
      VALUES (
        ${context.userId}::uuid,
        ${fullName || "New Client"},
        ${email || "no-email@example.com"},
        ${phone},
        ${company || "None"},
        ${industry},
        ${website},
        ${location},
        ${companySize},
        ${JSON.stringify(brandColors)}::jsonb,
        ${styleReferences},
        ${goals},
        ${budget},
        ${deadline},
        ${JSON.stringify(services)}::jsonb,
        'New'
      )
      RETURNING id
    `;
    const clientId = clientRows[0].id;

    await sql`
      INSERT INTO client_notes (client_id, body)
      VALUES (${clientId}, ${notesText})
    `;

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${clientId}, 'Created from form submission', 'submission')
    `;

    await sql`
      UPDATE form_submissions
      SET status = 'Converted',
          converted_client_id = ${clientId}::uuid
      WHERE id = ${sub.id}
    `;

    return { ok: true, clientId: String(clientId) };
  });

export const listAllSubmissions = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT
        fs.id,
        fs.form_id,
        fs.data,
        fs.submitter_name,
        fs.submitter_email,
        fs.submitted_at,
        fs.status,
        fs.converted_client_id,
        f.title AS form_title,
        f.fields AS form_fields
      FROM form_submissions fs
      JOIN forms f ON fs.form_id = f.id
      WHERE f.owner_id = ${context.userId}::uuid
      ORDER BY fs.submitted_at DESC
    `;
    return rows as unknown as (SubmissionRecord & { form_title: string; form_fields: FormField[] })[];
  });

export const listSimulatedEmails = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const dir = path.join(process.cwd(), "public", "emails");
    try {
      const files = await fs.readdir(dir);
      const list = [];
      for (const file of files) {
        if (!file.endsWith(".html")) continue;
        const filePath = path.join(dir, file);
        const html = await fs.readFile(filePath, "utf8");

        const metadataMatch = html.match(/<!-- email-metadata: (\{.*?\}) -->/);
        if (metadataMatch) {
          try {
            const meta = JSON.parse(metadataMatch[1]);
            list.push({
              filename: file,
              to: String(meta.to),
              subject: String(meta.subject),
              sentAt: String(meta.sentAt),
              previewUrl: `/emails/${file}`,
            });
            continue;
          } catch {
            // fallback
          }
        }

        // Fallback to filename parsing
        const parts = file.split("-");
        const timestamp = parseInt(parts[0], 10);
        const sentAt = isNaN(timestamp)
          ? new Date().toISOString()
          : new Date(timestamp).toISOString();
        const subjectRaw = parts.slice(1).join("-").replace(".html", "");
        const subject = subjectRaw
          ? subjectRaw.charAt(0).toUpperCase() + subjectRaw.slice(1).replace(/-/g, " ")
          : "Simulated Email";

        list.push({
          filename: file,
          to: "client@example.com",
          subject,
          sentAt,
          previewUrl: `/emails/${file}`,
        });
      }

      return list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    } catch {
      return [];
    }
  });

export const deleteSimulatedEmail = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { filename: string }) => z.object({ filename: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const dir = path.join(process.cwd(), "public", "emails");
    const base = path.basename(data.filename);
    const filePath = path.join(dir, base);
    try {
      await fs.unlink(filePath);
      return { ok: true };
    } catch (err) {
      throw new Error(`Failed to delete email file: ${(err as Error).message}`);
    }
  });
