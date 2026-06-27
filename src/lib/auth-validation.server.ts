import { z } from "zod";

const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAG_RE = /<[^>]*>/g;

export function stripHtmlAndScripts(value: string): string {
  return value.replace(SCRIPT_TAG_RE, "").replace(HTML_TAG_RE, "").trim();
}

export function sanitizeEmail(value: string): string {
  return stripHtmlAndScripts(value)
    .replace(/[<>'"`\\]/g, "")
    .trim()
    .toLowerCase();
}

export function sanitizeUsername(value: string): string {
  return stripHtmlAndScripts(value)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .trim();
}

export function sanitizeDisplayName(value: string): string {
  return stripHtmlAndScripts(value)
    .replace(/[<>'"`\\;{}]/g, "")
    .replace(/[^\p{L}\p{M}\s'.-]/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Strip markup only — preserve password special characters. */
export function sanitizePassword(value: string): string {
  return value.replace(SCRIPT_TAG_RE, "").replace(HTML_TAG_RE, "");
}

export const SignInBodySchema = z.object({
  email: z.string().transform(sanitizeEmail).pipe(z.string().email().max(255)),
  password: z.string().transform(sanitizePassword).pipe(z.string().min(8).max(128)),
});

export const SignUpBodySchema = z.object({
  email: z.string().transform(sanitizeEmail).pipe(z.string().email().max(255)),
  password: z.string().transform(sanitizePassword).pipe(z.string().min(8).max(128)),
  username: z
    .string()
    .transform(sanitizeUsername)
    .pipe(
      z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_-]+$/),
    ),
  displayName: z.string().transform(sanitizeDisplayName).pipe(z.string().min(1).max(100)),
});

export type SignInBody = z.infer<typeof SignInBodySchema>;
export type SignUpBody = z.infer<typeof SignUpBodySchema>;

type AuthRoute = "sign-in" | "sign-up";

export function validateAuthInput<T extends z.ZodType>(
  schema: T,
  raw: unknown,
  route: AuthRoute,
): { ok: true; data: z.infer<T> } | { ok: false } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  console.warn("[auth] Input validation failed", {
    route,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      code: issue.code,
    })),
  });

  return { ok: false };
}
