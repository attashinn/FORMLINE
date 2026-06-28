import { clerkClient } from "@clerk/tanstack-react-start/server";
import { z } from "zod";
import { AUTH_PASSWORD_RESET_MESSAGE, AUTH_REGISTRATION_ERROR } from "@/lib/auth.constants";
import {
  migrateClerkPasswordOnLogin,
  setPasswordForOwner,
  verifyOwnerPassword,
} from "@/lib/credentials.server";
import { getDeterministicUuid } from "@/lib/owner-id";
import {
  SignInBodySchema,
  SignUpBodySchema,
  sanitizeEmail,
  sanitizePassword,
  validateAuthInput,
} from "@/lib/auth-validation.server";
import {
  authLoginErrorResponse,
  enforceLoginAccountProtection,
  enforceLoginIpRateLimit,
  finalizeFailedLogin,
  finalizeSuccessfulLogin,
  issuePasswordResetTokenForEmail,
} from "@/lib/auth-rate-limit.server";
import { syncOwnerProfileFromClerk } from "@/lib/clerk.server";
import { sendPasswordResetEmail } from "@/lib/email.server";

function authJsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export { authLoginErrorResponse };

export function authRegistrationErrorResponse(status = 400) {
  return authJsonResponse({ error: AUTH_REGISTRATION_ERROR }, status);
}

export function authPasswordResetAckResponse() {
  return authJsonResponse({ message: AUTH_PASSWORD_RESET_MESSAGE }, 200);
}

export async function parseAuthRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    console.warn("[auth] Request body is not valid JSON");
    return null;
  }
}

export async function handleProtectedLoginRequest(request: Request) {
  const ipBlocked = await enforceLoginIpRateLimit(request);
  if (ipBlocked) return ipBlocked;

  const body = await parseAuthRequestBody(request);
  const validation = validateAuthInput(SignInBodySchema, body, "sign-in");
  if (!validation.ok) {
    return authLoginErrorResponse();
  }

  const accountBlocked = await enforceLoginAccountProtection(validation.data.email);
  if (accountBlocked) return accountBlocked;

  return handleSignInRequest(body);
}

async function createClerkSessionForUser(clerkUserId: string, email: string) {
  const ownerId = getDeterministicUuid(clerkUserId);
  await syncOwnerProfileFromClerk({ clerkUserId, ownerId });

  const signInToken = await clerkClient().signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 60,
  });

  await finalizeSuccessfulLogin(email);
  return authJsonResponse({ signInToken: signInToken.token }, 200);
}

async function performSignIn(email: string, password: string) {
  try {
    const local = await verifyOwnerPassword(email, password);
    if (local.valid) {
      const users = await clerkClient().users.getUserList({
        emailAddress: [email],
        limit: 1,
      });
      const user = users.data?.[0];
      if (!user) {
        console.warn("[auth] Sign-in rejected: account mapping failed");
        await finalizeFailedLogin(email);
        return authLoginErrorResponse();
      }
      return createClerkSessionForUser(user.id, email);
    }

    const userList = await clerkClient().users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    const user = userList.data?.[0];
    if (!user) {
      console.warn("[auth] Sign-in rejected");
      await finalizeFailedLogin(email);
      return authLoginErrorResponse();
    }

    if (local.ownerId) {
      console.warn("[auth] Sign-in rejected");
      await finalizeFailedLogin(email);
      return authLoginErrorResponse();
    }

    try {
      await clerkClient().users.verifyPassword({ userId: user.id, password });
    } catch {
      console.warn("[auth] Sign-in rejected");
      await finalizeFailedLogin(email);
      return authLoginErrorResponse();
    }

    const ownerId = getDeterministicUuid(user.id);
    await migrateClerkPasswordOnLogin({ ownerId, email, plaintext: password });
    return createClerkSessionForUser(user.id, email);
  } catch (err) {
    console.warn("[auth] Sign-in rejected", err);
    await finalizeFailedLogin(email);
    return authLoginErrorResponse();
  }
}

export async function handleSignInRequest(raw: unknown) {
  const result = validateAuthInput(SignInBodySchema, raw, "sign-in");
  if (!result.ok) {
    return authLoginErrorResponse();
  }

  return performSignIn(result.data.email, result.data.password);
}

export async function handleSignUpRequest(raw: unknown) {
  const result = validateAuthInput(SignUpBodySchema, raw, "sign-up");
  if (!result.ok) {
    return authRegistrationErrorResponse();
  }

  const { email, password, username, displayName } = result.data;
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? displayName;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  try {
    const user = await clerkClient().users.createUser({
      emailAddress: [email],
      username,
      firstName,
      ...(lastName ? { lastName } : {}),
      skipPasswordRequirement: true,
    });

    const ownerId = getDeterministicUuid(user.id);
    await setPasswordForOwner({ ownerId, email, plaintext: password });
    await syncOwnerProfileFromClerk({ clerkUserId: user.id, ownerId });

    const signInToken = await clerkClient().signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    return authJsonResponse({ signInToken: signInToken.token }, 200);
  } catch (err) {
    console.warn("[auth] Sign-up rejected", err);
    return authRegistrationErrorResponse();
  }
}

const RequestPasswordResetSchema = z.object({
  email: z.string().transform(sanitizeEmail).pipe(z.string().email().max(255)),
});

export async function handleRequestPasswordResetRequest(raw: unknown) {
  const parsed = RequestPasswordResetSchema.safeParse(raw);
  if (!parsed.success) {
    return authPasswordResetAckResponse();
  }

  try {
    const users = await clerkClient().users.getUserList({
      emailAddress: [parsed.data.email],
      limit: 1,
    });
    const user = users.data?.[0];
    if (user) {
      const resetToken = await issuePasswordResetTokenForEmail(parsed.data.email);
      await sendPasswordResetEmail({ to: parsed.data.email, resetToken });
    }
  } catch {
    console.warn("[auth] Password reset request processing failed");
  }

  return authPasswordResetAckResponse();
}

const ResetPasswordBodySchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().transform(sanitizePassword).pipe(z.string().min(8).max(128)),
});

export async function handleResetPasswordRequest(raw: unknown) {
  const parsed = ResetPasswordBodySchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[auth] Password reset validation failed");
    return authLoginErrorResponse();
  }

  try {
    const { resetPasswordWithToken } = await import("@/lib/auth-rate-limit.server");
    const updated = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!updated) {
      return authLoginErrorResponse();
    }

    return authJsonResponse({ ok: true }, 200);
  } catch {
    console.warn("[auth] Password reset rejected");
    return authLoginErrorResponse();
  }
}
