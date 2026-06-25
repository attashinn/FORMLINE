import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db.server";
import { requireClerkAuth } from "@/lib/auth.middleware";

export type NotificationRecord = {
  id: string;
  ownerId: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

function normalizeNotification(row: Record<string, unknown>): NotificationRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    message: String(row.message),
    link: row.link ? String(row.link) : undefined,
    read: Boolean(row.read),
    createdAt: String(row.created_at),
  };
}

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT *
      FROM notifications
      WHERE owner_id = ${context.userId}::uuid
      ORDER BY created_at DESC
      LIMIT 30
    `;
    return rows.map((row) => normalizeNotification(row as Record<string, unknown>));
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await sql`
      UPDATE notifications
      SET read = true
      WHERE id = ${data.id} AND owner_id = ${context.userId}::uuid
    `;
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    await sql`
      UPDATE notifications
      SET read = true
      WHERE owner_id = ${context.userId}::uuid AND read = false
    `;
    return { ok: true };
  });


