import { createFileRoute } from "@tanstack/react-router";
import { sql } from "@/lib/db.server";
import { sendAutomationEmail } from "@/lib/email.server";
import { normalizeAutomation } from "@/lib/automations.functions";
import { shouldRunTrigger } from "@/lib/automations.server";
import { getOwnerProfileByUuid } from "@/lib/clerk.server";
import { getOwnerNotificationSettings } from "@/lib/settings.server";
import crypto from "node:crypto";

function verifyCronRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[Cron] CRON_SECRET is not set — rejecting request in production");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const provided = bearer ?? cronHeader?.trim();
  if (!provided) return false;

  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export const Route = createFileRoute("/api/cron/weekly-summary")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!verifyCronRequest(request)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        console.log("[Cron] Weekly Summary Triggered");

        try {
          // 1. Find enabled automations with schedule triggers (weekly only)
          const automationRows = await sql`
            SELECT * FROM automations
            WHERE enabled = true AND nodes @> '[{"kind":"trigger_schedule"}]'::jsonb
          `;

          const weeklyOwnerIds = new Set<string>();
          const weeklyAutomationIds: string[] = [];

          for (const row of automationRows) {
            const auto = normalizeAutomation(row as Record<string, unknown>);
            const hasWeeklyTrigger = auto.nodes.some(
              (n) =>
                n.kind === "trigger_schedule" && shouldRunTrigger(n, "trigger_schedule", {}),
            );
            if (hasWeeklyTrigger) {
              weeklyOwnerIds.add(String(row.owner_id));
              weeklyAutomationIds.push(auto.id);
            }
          }

          if (weeklyOwnerIds.size === 0) {
            console.log("[Cron] No enabled weekly schedule automations found.");
            return new Response(JSON.stringify({ message: "No active weekly summary automations." }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2. Resolve owner emails from owners cache (Clerk fallback if cold)
          const results = [];

          for (const ownerId of weeklyOwnerIds) {
            const prefs = await getOwnerNotificationSettings(ownerId);
            if (!prefs.notificationWeeklyDigest) {
              console.log(`[Cron] Skipping weekly digest for owner ${ownerId} (disabled in settings)`);
              continue;
            }

            const owner = await getOwnerProfileByUuid(ownerId);
            const email = owner?.email;

            if (!email) {
              console.warn(`[Cron] Could not find email for owner UUID: ${ownerId}`);
              continue;
            }

            // 3. Query stats for last 7 days
            const submissionsResult = await sql`
              SELECT COUNT(*)::integer as count FROM form_submissions fs
              JOIN forms f ON fs.form_id = f.id
              WHERE f.owner_id = ${ownerId}::uuid AND fs.submitted_at >= NOW() - INTERVAL '7 days'
            `;
            const newSubmissionsCount = submissionsResult[0]?.count ?? 0;

            const clientsResult = await sql`
              SELECT COUNT(*)::integer as count FROM clients
              WHERE owner_id = ${ownerId}::uuid AND created_at >= NOW() - INTERVAL '7 days'
            `;
            const newClientsCount = clientsResult[0]?.count ?? 0;

            const completedTasksResult = await sql`
              SELECT COUNT(*)::integer as count FROM client_tasks ct
              JOIN clients c ON ct.client_id = c.id
              WHERE c.owner_id = ${ownerId}::uuid AND ct.completed = true AND ct.created_at >= NOW() - INTERVAL '7 days'
            `;
            const completedTasksCount = completedTasksResult[0]?.count ?? 0;

            const pendingTasksResult = await sql`
              SELECT COUNT(*)::integer as count FROM client_tasks ct
              JOIN clients c ON ct.client_id = c.id
              WHERE c.owner_id = ${ownerId}::uuid AND ct.completed = false
            `;
            const pendingTasksCount = pendingTasksResult[0]?.count ?? 0;

            // 4. Construct beautiful summary email
            const subject = "Your Formline Weekly Workspace Summary";
            const body = `Hi,\n\nHere is your Formline workspace summary for the last 7 days:\n\n- New Form Submissions: ${newSubmissionsCount}\n- New Clients Added: ${newClientsCount}\n- Client Tasks Completed: ${completedTasksCount}\n- Pending Client Tasks: ${pendingTasksCount}\n\nHave a productive week ahead!\n\nBest,\nFormline Team`;

            const htmlContent = `
              <div style="font-family: 'Outfit', 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #0F0F14; padding: 24px; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 28px; font-weight: 700; margin: 0; background: linear-gradient(135deg, #7C5CFF 0%, #A28CFF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: serif; font-style: italic;">Formline Digest</h1>
                  <p style="font-size: 14px; color: #71717A; margin-top: 4px;">Weekly Workspace Summary</p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #18181B; margin-bottom: 24px;">Hi ${owner?.firstName || "there"},</p>
                <p style="font-size: 15px; line-height: 1.6; color: #3F3F46; margin-bottom: 32px;">Here is a snapshot of your workspace activity over the past 7 days. Excellent work keeping things moving!</p>
                
                <div style="grid-template-columns: repeat(2, 1fr); gap: 16px; display: table; width: 100%; margin-bottom: 32px;">
                  <!-- Row 1 -->
                  <div style="display: table-row;">
                    <div style="display: table-cell; width: 50%; padding-right: 8px; padding-bottom: 16px;">
                      <div style="background-color: #F8F6FF; border: 1px solid #7C5CFF; border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #7C5CFF;">Submissions</div>
                        <div style="font-size: 32px; font-weight: 700; color: #0F0F14; margin-top: 8px;">${newSubmissionsCount}</div>
                        <div style="font-size: 11px; color: #71717A; margin-top: 4px;">Last 7 days</div>
                      </div>
                    </div>
                    <div style="display: table-cell; width: 50%; padding-left: 8px; padding-bottom: 16px;">
                      <div style="background-color: #F0FDF4; border: 1px solid #22C55E; border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #22C55E;">New Clients</div>
                        <div style="font-size: 32px; font-weight: 700; color: #0F0F14; margin-top: 8px;">${newClientsCount}</div>
                        <div style="font-size: 11px; color: #71717A; margin-top: 4px;">Converted</div>
                      </div>
                    </div>
                  </div>
                  <!-- Row 2 -->
                  <div style="display: table-row;">
                    <div style="display: table-cell; width: 50%; padding-right: 8px; padding-top: 8px;">
                      <div style="background-color: #F0FDFA; border: 1px solid #0D9488; border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0D9488;">Tasks Met</div>
                        <div style="font-size: 32px; font-weight: 700; color: #0F0F14; margin-top: 8px;">${completedTasksCount}</div>
                        <div style="font-size: 11px; color: #71717A; margin-top: 4px;">Completed</div>
                      </div>
                    </div>
                    <div style="display: table-cell; width: 50%; padding-left: 8px; padding-top: 8px;">
                      <div style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A;">Pending Tasks</div>
                        <div style="font-size: 32px; font-weight: 700; color: #0F0F14; margin-top: 8px;">${pendingTasksCount}</div>
                        <div style="font-size: 11px; color: #71717A; margin-top: 4px;">Total active</div>
                      </div>
                    </div>
                  </div>
                </div>

                <p style="font-size: 14px; line-height: 1.6; color: #52525B; margin-bottom: 24px; text-align: center;">
                  Need to tweak your workflow? <a href="${process.env.VITE_PUBLIC_APP_URL || "http://localhost:3000"}/automations" style="color: #7C5CFF; text-decoration: underline; font-weight: 600;">Configure Automations</a>
                </p>

                <div style="border-top: 1px solid #F4F4F5; padding-top: 24px; text-align: center;">
                  <p style="font-size: 12px; color: #A1A1AA; margin: 0;">Sent automatically by Formline scheduler on your request.</p>
                  <p style="font-size: 12px; color: #A1A1AA; margin: 4px 0 0 0;">&copy; 2026 Formline. All rights reserved.</p>
                </div>
              </div>
            `;

            // Send Email
            await sendAutomationEmail({
              to: email,
              subject,
              body,
            });

            // 5. Update runs for weekly schedule automations only
            for (const automationId of weeklyAutomationIds) {
              await sql`
                UPDATE automations
                SET runs = runs + 1, last_run = NOW()
                WHERE id = ${automationId}::uuid AND owner_id = ${ownerId}::uuid
              `;
            }

            results.push({ ownerId, email, success: true });
          }

          return new Response(JSON.stringify({ message: "Weekly summary digest cron completed.", results }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          console.error("[Cron] Failed to execute weekly summary cron:", error);
          return new Response(JSON.stringify({ error: error.message || "Failed to execute cron" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
