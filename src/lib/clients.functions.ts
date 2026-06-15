import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db.server";
import { requireClerkAuth } from "@/lib/auth.middleware";
import type { ActivityEntry, ClientFile, ClientRecord, ClientStatus } from "@/lib/clients-store";
import { deleteFileFromStorage, getSignedUrl, uploadFileToStorage } from "@/lib/storage.server";
import { createClientFromSource } from "@/lib/clients.server";
import crypto from "node:crypto";
import { sendPortalLinkEmail } from "./email.server";

const ClientStatusSchema = z.enum(["New", "In Progress", "Completed"]);

const ClientFileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(500),
  size: z.number().int().min(0).default(0),
  type: z.string().max(200).default(""),
  dataUrl: z.string().optional(),
  url: z.string().optional(),
  signedUrl: z.string().optional(),
});

const ClientPayloadSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(255),
  phone: z.string().max(100).default(""),
  company: z.string().min(1).max(200),
  industry: z.string().max(200).default(""),
  website: z.string().max(500).default(""),
  location: z.string().max(200).default(""),
  companySize: z.string().max(100).default(""),
  brandColors: z.array(z.string().max(32)).max(10).default([]),
  styleReferences: z.string().max(4000).default(""),
  goals: z.string().max(8000).default(""),
  budget: z.string().max(200).default(""),
  deadline: z.string().max(100).default(""),
  services: z.array(z.string().max(200)).max(50).default([]),
  notes: z.string().max(12000).default(""),
  files: z.array(ClientFileSchema).max(50).default([]),
  status: ClientStatusSchema.optional(),
});

const ClientPatchSchema = ClientPayloadSchema.partial().extend({
  status: ClientStatusSchema.optional(),
});

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeFile(row: Record<string, unknown>): ClientFile {
  return {
    id: String(row.id),
    name: String(row.name),
    size: Number(row.size ?? 0),
    type: String(row.type ?? ""),
    dataUrl: row.data_url ? String(row.data_url) : undefined,
    url: row.url ? String(row.url) : undefined,
  };
}

function normalizeActivity(row: Record<string, unknown>): ActivityEntry {
  return {
    id: String(row.id),
    label: String(row.label),
    timestamp: String(row.timestamp),
    kind: String(row.kind ?? "update") as ActivityEntry["kind"],
  };
}

async function hydrateClient(row: Record<string, unknown>): Promise<ClientRecord> {
  const [files, notes, activity] = await Promise.all([
    sql`
      SELECT id, name, size, type, data_url, url
      FROM client_files
      WHERE client_id = ${row.id}
      ORDER BY created_at ASC
    `,
    sql`
      SELECT body
      FROM client_notes
      WHERE client_id = ${row.id}
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    sql`
      SELECT id, label, kind, timestamp
      FROM client_activity
      WHERE client_id = ${row.id}
      ORDER BY timestamp DESC
    `,
  ]);

  const normalizedFiles = await Promise.all(
    files.map(async (file) => {
      const f = normalizeFile(file as Record<string, unknown>);
      if (f.url) {
        f.signedUrl = await getSignedUrl(f.url);
      }
      return f;
    }),
  );

  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone ?? ""),
    company: String(row.company),
    industry: String(row.industry ?? ""),
    website: String(row.website ?? ""),
    location: String(row.location ?? ""),
    companySize: String(row.company_size ?? ""),
    brandColors: parseStringArray(row.brand_colors),
    styleReferences: String(row.style_references ?? ""),
    goals: String(row.goals ?? ""),
    budget: String(row.budget ?? ""),
    deadline: String(row.deadline ?? ""),
    services: parseStringArray(row.services),
    notes: notes[0]?.body ? String(notes[0].body) : "",
    files: normalizedFiles,
    status: String(row.status ?? "New") as ClientStatus,
    portalToken: row.portal_token ? String(row.portal_token) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    activity: activity.map((item) => normalizeActivity(item as Record<string, unknown>)),
  };
}

async function getOwnedClientRow(clientId: string, ownerId: string) {
  const rows = await sql`
    SELECT *
    FROM clients
    WHERE id = ${clientId} AND owner_id = ${ownerId}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("Client not found");
  return rows[0] as Record<string, unknown>;
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT *
      FROM clients
      WHERE owner_id = ${context.userId}::uuid
      ORDER BY updated_at DESC
    `;
    return Promise.all(rows.map((row) => hydrateClient(row as Record<string, unknown>)));
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const row = await getOwnedClientRow(data.id, context.userId);
    return hydrateClient(row);
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => ClientPayloadSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { clientId } = await createClientFromSource({
      ownerId: context.userId,
      source: "intake",
      fields: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        industry: data.industry,
        website: data.website,
        location: data.location,
        companySize: data.companySize,
        brandColors: data.brandColors,
        styleReferences: data.styleReferences,
        goals: data.goals,
        budget: data.budget,
        deadline: data.deadline,
        services: data.services,
        notes: data.notes,
        status: data.status ?? "New",
        files: data.files,
      },
    });

    const row = await getOwnedClientRow(clientId, context.userId);
    return hydrateClient(row);
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string; patch: unknown; activityLabel?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        patch: ClientPatchSchema,
        activityLabel: z.string().min(1).max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const currentRow = await getOwnedClientRow(data.id, context.userId);
    const current = await hydrateClient(currentRow);
    const next = { ...current, ...data.patch };

    const rows = await sql`
      UPDATE clients
      SET full_name = ${next.fullName},
          email = ${next.email},
          phone = ${next.phone},
          company = ${next.company},
          industry = ${next.industry},
          website = ${next.website},
          location = ${next.location},
          company_size = ${next.companySize},
          brand_colors = ${JSON.stringify(next.brandColors)}::jsonb,
          style_references = ${next.styleReferences},
          goals = ${next.goals},
          budget = ${next.budget},
          deadline = ${next.deadline},
          services = ${JSON.stringify(next.services)}::jsonb,
          status = ${next.status},
          updated_at = NOW()
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      RETURNING *
    `;

    if (Object.prototype.hasOwnProperty.call(data.patch, "notes")) {
      await sql`
        INSERT INTO client_notes (client_id, body)
        VALUES (${data.id}, ${next.notes})
      `;
    }

    if (Object.prototype.hasOwnProperty.call(data.patch, "files")) {
      await sql`DELETE FROM client_files WHERE client_id = ${data.id}`;
      for (const file of next.files) {
        await sql`
          INSERT INTO client_files (client_id, name, size, type, data_url, url)
          VALUES (${data.id}, ${file.name}, ${file.size}, ${file.type}, ${file.dataUrl ?? null}, ${file.url ?? null})
        `;
      }
    }

    const activityLabel =
      data.activityLabel ??
      (data.patch.status && data.patch.status !== current.status
        ? `Status changed to ${data.patch.status}`
        : undefined);

    if (activityLabel) {
      const kind = data.patch.status
        ? "status"
        : data.patch.notes !== undefined
          ? "note"
          : "update";
      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${data.id}, ${activityLabel}, ${kind})
      `;
    }

    if (data.patch.status && data.patch.status !== current.status) {
      try {
        const { executeAutomationsForEvent } = await import("./automations.server");
        await executeAutomationsForEvent({
          ownerId: context.userId,
          trigger: "trigger_status_change",
          payload: {
            clientId: data.id,
            newStatus: data.patch.status,
            status: data.patch.status,
            oldStatus: String(current.status),
            clientName: String(current.fullName),
            clientEmail: String(current.email),
            clientCompany: String(current.company),
          },
        });
      } catch (e) {
        console.error("Automation execution error for status change:", e);
      }
    }

    return hydrateClient(rows[0] as Record<string, unknown>);
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      DELETE FROM clients
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
      RETURNING id
    `;
    if (rows.length === 0) throw new Error("Client not found");
    return { ok: true };
  });

export const deleteClientFile = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { fileId: string }) => z.object({ fileId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const rows = await sql`
      SELECT cf.*, c.owner_id
      FROM client_files cf
      JOIN clients c ON cf.client_id = c.id
      WHERE cf.id = ${data.fileId}
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("File not found");
    const file = rows[0];
    if (file.owner_id !== context.userId) {
      throw new Error("Unauthorized");
    }

    await sql`DELETE FROM client_files WHERE id = ${data.fileId}`;

    if (file.url) {
      await deleteFileFromStorage(file.url);
    }

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${file.client_id}, ${`File "${file.name}" deleted`}, 'update')
    `;

    return { ok: true };
  });

export const getOrCreatePortalToken = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { clientId: string }) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await getOwnedClientRow(data.clientId, context.userId);

    const rows = await sql`
      SELECT portal_token FROM clients WHERE id = ${data.clientId}
    `;
    let token = rows[0]?.portal_token;

    if (!token) {
      token = crypto.randomBytes(24).toString("hex");
      await sql`
        UPDATE clients
        SET portal_token = ${token}
        WHERE id = ${data.clientId}
      `;

      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${data.clientId}, 'Client portal link generated', 'update')
      `;
    }
    return { token };
  });

export const regeneratePortalToken = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { clientId: string }) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await getOwnedClientRow(data.clientId, context.userId);

    const token = crypto.randomBytes(24).toString("hex");
    await sql`
      UPDATE clients
      SET portal_token = ${token}
      WHERE id = ${data.clientId}
    `;

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${data.clientId}, 'Client portal link regenerated', 'update')
    `;

    return { token };
  });

export const uploadClientFile = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator(
    (d: { clientId: string; fileName: string; fileSize: number; fileType: string; fileBase64: string }) =>
      z
        .object({
          clientId: z.string().uuid(),
          fileName: z.string().min(1).max(500),
          fileSize: z.number().int().min(0),
          fileType: z.string().max(200).default(""),
          fileBase64: z.string().min(1),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    // verify client ownership
    await getOwnedClientRow(data.clientId, context.userId);

    const buffer = Buffer.from(data.fileBase64, "base64");
    const storagePathOrUrl = await uploadFileToStorage(buffer, data.fileName, data.fileType);

    const rows = await sql`
      INSERT INTO client_files (client_id, name, size, type, url)
      VALUES (${data.clientId}, ${data.fileName}, ${data.fileSize}, ${data.fileType}, ${storagePathOrUrl})
      RETURNING *
    `;

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${data.clientId}, ${`File "${data.fileName}" uploaded`}, 'update')
    `;

    const newFile = normalizeFile(rows[0] as Record<string, unknown>);
    if (newFile.url) {
      newFile.signedUrl = await getSignedUrl(newFile.url);
    }
    return newFile;
  });

export const uploadPortalFile = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; fileName: string; fileSize: number; fileType: string; fileBase64: string }) =>
      z
        .object({
          token: z.string().min(1),
          fileName: z.string().min(1).max(500),
          fileSize: z.number().int().min(0),
          fileType: z.string().max(200).default(""),
          fileBase64: z.string().min(1),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const clientRows = await sql`
      SELECT id, full_name, company FROM clients WHERE portal_token = ${data.token} LIMIT 1
    `;
    if (clientRows.length === 0) throw new Error("Invalid portal token");
    const client = clientRows[0];

    const buffer = Buffer.from(data.fileBase64, "base64");
    const storagePathOrUrl = await uploadFileToStorage(buffer, data.fileName, data.fileType);

    const rows = await sql`
      INSERT INTO client_files (client_id, name, size, type, url)
      VALUES (${client.id}, ${data.fileName}, ${data.fileSize}, ${data.fileType}, ${storagePathOrUrl})
      RETURNING *
    `;

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${client.id}, ${`File "${data.fileName}" uploaded via Client Portal`}, 'update')
    `;

    const newFile = normalizeFile(rows[0] as Record<string, unknown>);
    if (newFile.url) {
      newFile.signedUrl = await getSignedUrl(newFile.url);
    }
    return newFile;
  });

export const emailPortalLinkToClient = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { clientId: string; message?: string }) =>
    z
      .object({
        clientId: z.string().uuid(),
        message: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // verify client ownership
    const client = await getOwnedClientRow(data.clientId, context.userId);
    const portalToken = client.portal_token;
    if (!portalToken) {
      throw new Error("Portal link must be generated before emailing the client.");
    }

    const appUrl = (process.env.VITE_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const portalUrl = `${appUrl}/portal/${portalToken}`;

    await sendPortalLinkEmail({
      to: client.email as string,
      clientName: client.full_name as string,
      companyName: client.company as string,
      portalUrl,
      message: data.message,
    });

    await sql`
      INSERT INTO client_activity (client_id, label, kind)
      VALUES (${data.clientId}, ${`Portal link emailed to ${client.email}`}, 'update')
    `;

    return { ok: true };
  });
