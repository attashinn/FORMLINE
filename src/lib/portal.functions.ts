import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db.server";
import { getSignedUrl } from "@/lib/storage.server";

// Public server functions (authenticated via token)

function normalizePortalFile(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    size: Number(row.size ?? 0),
    type: String(row.type ?? ""),
    url: row.url ? String(row.url) : undefined,
    dataUrl: row.data_url ? String(row.data_url) : undefined,
  };
}

export const getPortalData = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const rows = await sql`
      SELECT id, full_name, email, phone, company
      FROM clients
      WHERE portal_token = ${data.token}
      LIMIT 1
    `;
    if (rows.length === 0) {
      throw new Error("Client portal link is invalid or expired");
    }
    const client = rows[0];

    const fileRows = await sql`
      SELECT id, name, size, type, data_url, url
      FROM client_files
      WHERE client_id = ${client.id}
      ORDER BY created_at ASC
    `;

    const normalizedFiles = await Promise.all(
      fileRows.map(async (row) => {
        const f = normalizePortalFile(row as Record<string, unknown>);
        let signedUrl = f.dataUrl;
        if (f.url) {
          signedUrl = await getSignedUrl(f.url);
        }
        return { ...f, signedUrl };
      }),
    );

    return {
      client: {
        id: String(client.id),
        fullName: String(client.full_name),
        email: String(client.email),
        phone: String(client.phone ?? ""),
        company: String(client.company),
      },
      files: normalizedFiles,
    };
  });

export const submitPortalInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; fullName: string; email: string; phone: string }) =>
    z
      .object({
        token: z.string().min(1),
        fullName: z.string().min(1).max(200),
        email: z.string().email().max(255),
        phone: z.string().max(100).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const rows = await sql`
      SELECT id, full_name, email, phone FROM clients WHERE portal_token = ${data.token} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new Error("Invalid portal token");
    }
    const client = rows[0];

    await sql`
      UPDATE clients
      SET full_name = ${data.fullName},
          email = ${data.email},
          phone = ${data.phone},
          updated_at = NOW()
      WHERE id = ${client.id}
    `;

    // Track what changed
    const changes: string[] = [];
    if (data.fullName !== client.full_name) changes.push("Name");
    if (data.email !== client.email) changes.push("Email");
    if (data.phone !== (client.phone ?? "")) changes.push("Phone");

    if (changes.length > 0) {
      const label = `Contact info (${changes.join(", ")}) updated via Client Portal`;
      await sql`
        INSERT INTO client_activity (client_id, label, kind)
        VALUES (${client.id}, ${label}, 'update')
      `;
    }

    return { ok: true };
  });
