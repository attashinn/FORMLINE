import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/lib/auth.middleware";
import type { OwnerSettings } from "@/lib/settings.types";

export type { OwnerSettings } from "@/lib/settings.types";

const SettingsPatchSchema = z.object({
  notificationEmail: z.string().email().max(255).nullable().optional(),
  notificationFormSubmit: z.boolean().optional(),
  notificationWeeklyDigest: z.boolean().optional(),
  notificationClientStatusChange: z.boolean().optional(),
  notificationFormPublished: z.boolean().optional(),
});

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const { readOwnerSettings } = await import("@/lib/settings.server");
    return readOwnerSettings(context.userId);
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .inputValidator((d: unknown) => SettingsPatchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { readOwnerSettings, writeOwnerSettings } = await import("@/lib/settings.server");
    const current = await readOwnerSettings(context.userId);
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

    return writeOwnerSettings(context.userId, next);
  });
