import { sql } from "@/lib/db.server";

// Internal server-only helper to create a notification
export async function createNotification(ownerId: string, message: string, link?: string) {
  try {
    await sql`
      INSERT INTO notifications (owner_id, message, link)
      VALUES (${ownerId}::uuid, ${message}, ${link ?? null})
    `;
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
