import { sql } from "@/lib/db.server";
import type { OwnerSettings } from "@/lib/settings.types";

const DEFAULT_SETTINGS: OwnerSettings = {
  notificationEmail: null,
  notificationFormSubmit: true,
  notificationWeeklyDigest: false,
  notificationClientStatusChange: true,
  notificationFormPublished: false,
  countryCode: "US",
  currencyCode: "USD",
};

function isMissingRelationError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err.code === "42P01" || err.code === "42703"),
  );
}

function normalizeSettingsRow(row: Record<string, unknown>): OwnerSettings {
  return {
    notificationEmail: row.notification_email ? String(row.notification_email) : null,
    notificationFormSubmit: row.notification_form_submit !== false,
    notificationWeeklyDigest: Boolean(row.notification_weekly_digest),
    notificationClientStatusChange: row.notification_client_status_change !== false,
    notificationFormPublished: Boolean(row.notification_form_published),
    countryCode: row.country_code ? String(row.country_code) : "US",
    currencyCode: row.currency_code ? String(row.currency_code) : "USD",
  };
}

export async function readOwnerSettings(ownerId: string): Promise<OwnerSettings> {
  try {
    const rows = await sql`
      SELECT *
      FROM owner_settings
      WHERE owner_id = ${ownerId}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) return { ...DEFAULT_SETTINGS };
    return normalizeSettingsRow(rows[0] as Record<string, unknown>);
  } catch (err) {
    if (isMissingRelationError(err)) {
      console.warn("[settings] owner_settings table missing — run npm run db:migrate");
      return { ...DEFAULT_SETTINGS };
    }
    throw err;
  }
}

/** Server-side lookup for notification gates (form submit, cron, etc.). */
export async function getOwnerNotificationSettings(ownerId: string): Promise<OwnerSettings> {
  return readOwnerSettings(ownerId);
}

export async function writeOwnerSettings(ownerId: string, next: OwnerSettings): Promise<OwnerSettings> {
  try {
    await sql`
      INSERT INTO owner_settings (
        owner_id,
        notification_email,
        notification_form_submit,
        notification_weekly_digest,
        notification_client_status_change,
        notification_form_published,
        country_code,
        currency_code,
        updated_at
      )
      VALUES (
        ${ownerId}::uuid,
        ${next.notificationEmail},
        ${next.notificationFormSubmit},
        ${next.notificationWeeklyDigest},
        ${next.notificationClientStatusChange},
        ${next.notificationFormPublished},
        ${next.countryCode},
        ${next.currencyCode},
        NOW()
      )
      ON CONFLICT (owner_id) DO UPDATE SET
        notification_email = EXCLUDED.notification_email,
        notification_form_submit = EXCLUDED.notification_form_submit,
        notification_weekly_digest = EXCLUDED.notification_weekly_digest,
        notification_client_status_change = EXCLUDED.notification_client_status_change,
        notification_form_published = EXCLUDED.notification_form_published,
        country_code = EXCLUDED.country_code,
        currency_code = EXCLUDED.currency_code,
        updated_at = NOW()
    `;
  } catch (err) {
    if (isMissingRelationError(err)) {
      throw new Error(
        "Notification settings are not available yet. Run npm run db:migrate on the production database.",
      );
    }
    throw err;
  }

  return next;
}

