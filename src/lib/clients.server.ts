import { sql } from "@/lib/db";

export type ClientSource = "intake" | "form_convert" | "automation";

export type ClientFileInput = {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  url?: string;
};

export type ClientFieldsInput = {
  fullName: string;
  email: string;
  phone?: string;
  company: string;
  industry?: string;
  website?: string;
  location?: string;
  companySize?: string;
  brandColors?: string[];
  styleReferences?: string;
  goals?: string;
  budget?: string;
  deadline?: string;
  services?: string[];
  notes?: string;
  status?: "New" | "In Progress" | "Completed";
  files?: ClientFileInput[];
};

export type CreateClientFromSourceOpts = {
  ownerId: string;
  source: ClientSource;
  fields: ClientFieldsInput;
  /** When set, links the submission to the client (new or existing). */
  submissionId?: string;
};

export type CreateClientFromSourceResult = {
  clientId: string;
  isNew: boolean;
};

const PLACEHOLDER_EMAIL = "no-email@example.com";

/**
 * Dedup rule: clients are matched per owner by case-insensitive email.
 * Placeholder / missing emails never dedupe — each creates a separate client.
 */
export function isDedupableEmail(email: string | undefined | null): boolean {
  if (!email || !email.trim()) return false;
  return email.trim().toLowerCase() !== PLACEHOLDER_EMAIL;
}

const ACTIVITY_BY_SOURCE: Record<ClientSource, string> = {
  intake: "Intake form submitted",
  form_convert: "Created from form submission",
  automation: "Created via Automation",
};

const DEDUP_ACTIVITY_BY_SOURCE: Record<ClientSource, string> = {
  intake: "Matched existing client from intake (same email)",
  form_convert: "Linked to existing client from form submission",
  automation: "Linked submission to existing client via Automation",
};

async function findClientByEmail(ownerId: string, email: string) {
  const rows = await sql`
    SELECT id, full_name, email, company, status
    FROM clients
    WHERE owner_id = ${ownerId}::uuid
      AND LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] as Record<string, unknown> | undefined;
}

async function linkSubmissionToClient(submissionId: string, clientId: string) {
  await sql`
    UPDATE form_submissions
    SET status = 'Converted',
        converted_client_id = ${clientId}::uuid
    WHERE id = ${submissionId}::uuid
  `;
}

async function insertClientFiles(
  clientId: string,
  files: ClientFileInput[],
) {
  for (const file of files) {
    await sql`
      INSERT INTO client_files (client_id, name, size, type, data_url, url)
      VALUES (
        ${clientId},
        ${file.name},
        ${file.size},
        ${file.type},
        ${file.dataUrl ?? null},
        ${file.url ?? null}
      )
    `;
  }
}

async function fireNewClientAutomations(
  ownerId: string,
  client: Record<string, unknown>,
) {
  try {
    const { executeAutomationsForEvent } = await import("./automations.server");
    await executeAutomationsForEvent({
      ownerId,
      trigger: "trigger_new_client",
      payload: {
        clientId: String(client.id),
        clientName: String(client.full_name),
        clientEmail: String(client.email),
        clientCompany: String(client.company),
        status: String(client.status),
      },
    });
  } catch (e) {
    console.error("Automation execution error for new client trigger:", e);
  }
}

export async function createClientFromSource(
  opts: CreateClientFromSourceOpts,
): Promise<CreateClientFromSourceResult> {
  const { ownerId, source, fields, submissionId } = opts;
  const email = fields.email.trim() || PLACEHOLDER_EMAIL;

  if (isDedupableEmail(email)) {
    const existing = await findClientByEmail(ownerId, email);
    if (existing) {
      const clientId = String(existing.id);

      if (fields.notes?.trim()) {
        await sql`
          INSERT INTO client_notes (client_id, body)
          VALUES (${clientId}, ${fields.notes})
        `;
      }

      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${clientId}, ${DEDUP_ACTIVITY_BY_SOURCE[source]}, ${source === "form_convert" || submissionId ? "submission" : "update"})
      `;

      if (submissionId) {
        await linkSubmissionToClient(submissionId, clientId);
      }

      return { clientId, isNew: false };
    }
  }

  const rows = await sql`
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
      ${ownerId}::uuid,
      ${fields.fullName},
      ${email},
      ${fields.phone ?? ""},
      ${fields.company},
      ${fields.industry ?? ""},
      ${fields.website ?? ""},
      ${fields.location ?? ""},
      ${fields.companySize ?? ""},
      ${JSON.stringify(fields.brandColors ?? [])}::jsonb,
      ${fields.styleReferences ?? ""},
      ${fields.goals ?? ""},
      ${fields.budget ?? ""},
      ${fields.deadline ?? ""},
      ${JSON.stringify(fields.services ?? [])}::jsonb,
      ${fields.status ?? "New"}
    )
    RETURNING *
  `;
  const client = rows[0] as Record<string, unknown>;
  const clientId = String(client.id);

  if (fields.notes?.trim()) {
    await sql`
      INSERT INTO client_notes (client_id, body)
      VALUES (${clientId}, ${fields.notes})
    `;
  }

  await sql`
    INSERT INTO client_activity (client_id, label, kind)
    VALUES (${clientId}, ${ACTIVITY_BY_SOURCE[source]}, ${source === "intake" || source === "form_convert" ? "submission" : "system"})
  `;

  if (fields.files?.length) {
    await insertClientFiles(clientId, fields.files);
  }

  if (submissionId) {
    await linkSubmissionToClient(submissionId, clientId);
  }

  await fireNewClientAutomations(ownerId, client);

  return { clientId, isNew: true };
}
