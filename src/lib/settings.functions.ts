import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireClerkAuth } from "@/lib/forms.functions";

export type OwnerSettings = {
  notificationEmail: string | null;
  notificationFormSubmit: boolean;
  notificationWeeklyDigest: boolean;
  notificationClientStatusChange: boolean;
  notificationFormPublished: boolean;
};

const DEFAULT_SETTINGS: OwnerSettings = {
  notificationEmail: null,
  notificationFormSubmit: true,
  notificationWeeklyDigest: false,
  notificationClientStatusChange: true,
  notificationFormPublished: false,
};

const SettingsPatchSchema = z.object({
  notificationEmail: z.string().email().max(255).nullable().optional(),
  notificationFormSubmit: z.boolean().optional(),
  notificationWeeklyDigest: z.boolean().optional(),
  notificationClientStatusChange: z.boolean().optional(),
  notificationFormPublished: z.boolean().optional(),
});

function normalizeSettingsRow(row: Record<string, unknown>): OwnerSettings {
  return {
    notificationEmail: row.notification_email ? String(row.notification_email) : null,
    notificationFormSubmit: row.notification_form_submit !== false,
    notificationWeeklyDigest: Boolean(row.notification_weekly_digest),
    notificationClientStatusChange: row.notification_client_status_change !== false,
    notificationFormPublished: Boolean(row.notification_form_published),
  };
}

/** Server-side lookup for notification gates (form submit, cron, etc.). */
export async function getOwnerNotificationSettings(ownerId: string): Promise<OwnerSettings> {
  const rows = await sql`
    SELECT *
    FROM owner_settings
    WHERE owner_id = ${ownerId}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return { ...DEFAULT_SETTINGS };
  return normalizeSettingsRow(rows[0] as Record<string, unknown>);
}

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const rows = await sql`
      SELECT *
      FROM owner_settings
      WHERE owner_id = ${context.userId}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) return { ...DEFAULT_SETTINGS };
    return normalizeSettingsRow(rows[0] as Record<string, unknown>);
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => SettingsPatchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const current = await getOwnerNotificationSettings(context.userId);
    const next: OwnerSettings = {
      notificationEmail:
        data.notificationEmail !== undefined ? data.notificationEmail : current.notificationEmail,
      notificationFormSubmit:
        data.notificationFormSubmit ?? current.notificationFormSubmit,
      notificationWeeklyDigest:
        data.notificationWeeklyDigest ?? current.notificationWeeklyDigest,
      notificationClientStatusChange:
        data.notificationClientStatusChange ?? current.notificationClientStatusChange,
      notificationFormPublished:
        data.notificationFormPublished ?? current.notificationFormPublished,
    };

    await sql`
      INSERT INTO owner_settings (
        owner_id,
        notification_email,
        notification_form_submit,
        notification_weekly_digest,
        notification_client_status_change,
        notification_form_published,
        updated_at
      )
      VALUES (
        ${context.userId}::uuid,
        ${next.notificationEmail},
        ${next.notificationFormSubmit},
        ${next.notificationWeeklyDigest},
        ${next.notificationClientStatusChange},
        ${next.notificationFormPublished},
        NOW()
      )
      ON CONFLICT (owner_id) DO UPDATE SET
        notification_email = EXCLUDED.notification_email,
        notification_form_submit = EXCLUDED.notification_form_submit,
        notification_weekly_digest = EXCLUDED.notification_weekly_digest,
        notification_client_status_change = EXCLUDED.notification_client_status_change,
        notification_form_published = EXCLUDED.notification_form_published,
        updated_at = NOW()
    `;

    return next;
  });
