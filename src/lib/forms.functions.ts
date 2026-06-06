import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { auth } from "@clerk/tanstack-react-start/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import type { FormField, FormRecord, SubmissionRecord } from "./forms.types";

type Json = any;

/** Map a Clerk user id to a stable, valid UUID v4 for Postgres. */
function getDeterministicUuid(str: string): string {
  const hash = crypto.createHash("md5").update(str).digest("hex");
  const variant = ((parseInt(hash[15], 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(12, 15)}-${variant}${hash.slice(16, 19)}-${hash.slice(19, 31)}`;
}

export const requireClerkAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Not logged in");
    }
    const mappedUuid = getDeterministicUuid(userId);
    return next({
      context: {
        userId: mappedUuid,
      },
    });
  }
);

const FieldSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["text", "email", "textarea", "select", "checkbox", "date", "number", "tel"]),
  label: z.string().min(1).max(200),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().min(1).max(200)).max(50).optional(),
});

export const listForms = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT * FROM forms
      WHERE owner_id = ${context.userId}
      ORDER BY updated_at DESC
    `;
    return rows as unknown as FormRecord[];
  });

export const getForm = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const forms = await sql`
      SELECT * FROM forms
      WHERE id = ${data.id} AND owner_id = ${context.userId}
      LIMIT 1
    `;
    if (forms.length === 0) throw new Error("Not found");
    const form = forms[0];

    const submissions = await sql`
      SELECT * FROM form_submissions
      WHERE form_id = ${data.id}
      ORDER BY submitted_at DESC
    `;
    return {
      form: form as unknown as FormRecord,
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
      VALUES (${context.userId}, ${data.title}, ${data.description ?? null}, ${JSON.stringify(data.fields)}::jsonb)
      RETURNING *
    `;
    return rows[0] as unknown as FormRecord;
  });

export const updateForm = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: {
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
      WHERE id = ${data.id} AND owner_id = ${context.userId}
      RETURNING *
    `;
    if (rows.length === 0) throw new Error("Not found or unauthorized");
    return rows[0] as unknown as FormRecord;
  });

export const deleteForm = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      DELETE FROM forms
      WHERE id = ${data.id} AND owner_id = ${context.userId}
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
      WHERE id = ${sub.form_id} AND owner_id = ${context.userId}
      LIMIT 1
    `;
    if (forms.length === 0) throw new Error("Unauthorized");

    await sql`
      DELETE FROM form_submissions
      WHERE id = ${data.id}
    `;
    return { ok: true };
  });

// Public — no auth. Used by the public share page.
export const getPublicForm = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/) }).parse(d),
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
    return form as unknown as Pick<FormRecord, "id" | "title" | "description" | "fields" | "is_published" | "share_token">;
  });

export const submitPublicForm = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    data: Record<string, unknown>;
    submitter_name?: string;
    submitter_email?: string;
  }) =>
    z
      .object({
        token: z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/),
        data: z.record(z.string(), z.unknown()),
        submitter_name: z.string().max(200).optional(),
        submitter_email: z.string().email().max(255).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const forms = await sql`
      SELECT id, is_published FROM forms
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
    return { ok: true };
  });
