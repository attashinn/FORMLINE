import { sql } from "@/lib/db.server";

/** Format currency for notification messages (always 2 decimal places, grouped). */
export function formatNotificationAmount(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Internal server-only helper to create a notification
export async function createNotification(ownerId: string, message: string, link?: string) {
  try {
    const recent = await sql`
      SELECT id FROM notifications
      WHERE owner_id = ${ownerId}::uuid
        AND message = ${message}
        AND created_at > NOW() - INTERVAL '10 minutes'
      LIMIT 1
    `;
    if (recent.length > 0) return;

    await sql`
      INSERT INTO notifications (owner_id, message, link)
      VALUES (${ownerId}::uuid, ${message}, ${link ?? null})
    `;
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
