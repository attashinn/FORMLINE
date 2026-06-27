import crypto from "node:crypto";
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { AUTH_LOGIN_ERROR } from "@/lib/auth.constants";
import {
  cacheDel,
  cacheGet,
  cacheIncr,
  cacheSet,
  cacheSetNx,
  hashEmail,
  hashIp,
  sleep,
} from "@/lib/auth-cache.server";
import { setPasswordForOwner } from "@/lib/credentials.server";
import { getDeterministicUuid } from "@/lib/owner-id";
import { sendAccountLockoutEmail } from "@/lib/email.server";

const IP_LIMIT = 10;
const IP_WINDOW_SECONDS = 60;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const FAILED_ATTEMPT_TTL_SECONDS = LOCKOUT_SECONDS;
const RESET_TOKEN_TTL_SECONDS = 60 * 60;
const LOCKOUT_NOTIFY_TTL_SECONDS = LOCKOUT_SECONDS;

function authJsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function authLoginErrorResponse(status = 401) {
  return authJsonResponse({ error: AUTH_LOGIN_ERROR }, status);
}

/** @deprecated Use authLoginErrorResponse */
export const authErrorResponse = authLoginErrorResponse;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function isAccountLocked(email: string): Promise<boolean> {
  const lockUntilRaw = await cacheGet(`auth:lock:${hashEmail(email)}`);
  if (!lockUntilRaw) return false;
  const lockUntil = Number(lockUntilRaw);
  if (!Number.isFinite(lockUntil) || lockUntil <= Date.now()) {
    await cacheDel(`auth:lock:${hashEmail(email)}`);
    return false;
  }
  return true;
}

async function applyProgressiveDelay(email: string): Promise<void> {
  const failKey = `auth:fail:${hashEmail(email)}`;
  const previousFailuresRaw = await cacheGet(failKey);
  const previousFailures = previousFailuresRaw ? Number(previousFailuresRaw) : 0;
  if (previousFailures <= 0) return;

  const delayMs = Math.min(previousFailures * 1000, 10_000);
  console.info("[auth] Applying progressive login delay", {
    emailHash: hashEmail(email),
    delayMs,
    previousFailures,
  });
  await sleep(delayMs);
}

async function clearLoginFailures(email: string): Promise<void> {
  const emailHash = hashEmail(email);
  await cacheDel(`auth:fail:${emailHash}`);
  await cacheDel(`auth:lock:${emailHash}`);
}

async function issuePasswordResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await cacheSet(`auth:reset:${token}`, email.toLowerCase().trim(), RESET_TOKEN_TTL_SECONDS);
  return token;
}

export async function issuePasswordResetTokenForEmail(email: string): Promise<string> {
  return issuePasswordResetToken(email);
}

async function notifyAccountLockout(email: string): Promise<void> {
  const emailHash = hashEmail(email);
  const notifyKey = `auth:lock-notified:${emailHash}`;
  const shouldNotify = await cacheSetNx(notifyKey, "1", LOCKOUT_NOTIFY_TTL_SECONDS);
  if (!shouldNotify) return;

  try {
    const resetToken = await issuePasswordResetToken(email);
    await sendAccountLockoutEmail({ to: email, resetToken });
    console.warn("[auth] Account lockout notification sent", { emailHash });
  } catch (err) {
    console.error("[auth] Failed to send account lockout email:", err);
  }
}

async function recordLoginFailure(email: string): Promise<void> {
  const emailHash = hashEmail(email);
  const failKey = `auth:fail:${emailHash}`;
  const failures = await cacheIncr(failKey, FAILED_ATTEMPT_TTL_SECONDS);

  console.warn("[auth] Failed login attempt recorded", {
    emailHash,
    failures,
  });

  if (failures >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_SECONDS * 1000;
    await cacheSet(`auth:lock:${emailHash}`, String(lockUntil), LOCKOUT_SECONDS);
    console.warn("[auth] Account locked after consecutive failures", {
      emailHash,
      lockoutMinutes: LOCKOUT_SECONDS / 60,
    });
    await notifyAccountLockout(email);
  }
}

/**
 * Login protection middleware: IP rate limit, account lockout, progressive delay.
 * Always returns the same generic error body when blocked.
 */
export async function enforceLoginIpRateLimit(request: Request): Promise<Response | null> {
  const ip = getClientIp(request);
  const ipKey = `auth:rl:ip:${ip}`;
  const ipCount = await cacheIncr(ipKey, IP_WINDOW_SECONDS);

  if (ipCount > IP_LIMIT) {
    console.warn("[auth] IP rate limit exceeded", { ipHash: hashIp(ip), count: ipCount });
    return authLoginErrorResponse();
  }

  return null;
}

export async function enforceLoginAccountProtection(email: string): Promise<Response | null> {
  if (await isAccountLocked(email)) {
    console.warn("[auth] Locked account login attempt blocked", {
      emailHash: hashEmail(email),
    });
    return authLoginErrorResponse();
  }

  await applyProgressiveDelay(email);
  return null;
}

export async function enforceLoginProtection(
  request: Request,
  email?: string,
): Promise<Response | null> {
  const ipBlocked = await enforceLoginIpRateLimit(request);
  if (ipBlocked) return ipBlocked;

  if (email) {
    return enforceLoginAccountProtection(email);
  }

  return null;
}

export async function finalizeSuccessfulLogin(email: string): Promise<void> {
  await clearLoginFailures(email);
}

export async function finalizeFailedLogin(email: string): Promise<void> {
  await recordLoginFailure(email);
}

export async function resolvePasswordResetToken(token: string): Promise<string | null> {
  const email = await cacheGet(`auth:reset:${token}`);
  return email ?? null;
}

export async function consumePasswordResetToken(token: string): Promise<void> {
  await cacheDel(`auth:reset:${token}`);
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const email = await resolvePasswordResetToken(token);
  if (!email) return false;

  const users = await clerkClient().users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const user = users.data?.[0];
  if (!user) return false;

  const ownerId = getDeterministicUuid(user.id);
  await setPasswordForOwner({ ownerId, email, plaintext: newPassword });

  try {
    await clerkClient().users.updateUser(user.id, { password: newPassword });
  } catch {
    console.warn("[auth] Clerk password sync skipped after local bcrypt update");
  }

  await consumePasswordResetToken(token);
  await clearLoginFailures(email);
  return true;
}
