import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, useSignIn } from "@clerk/tanstack-react-start";
import type { OAuthStrategy } from "@clerk/shared/types";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_LOGIN_ERROR, AUTH_REGISTRATION_ERROR } from "@/lib/auth.constants";

const inputClassName =
  "h-11 border-white/10 bg-[#141418] text-[#F5F5F7] placeholder:text-white/40 focus-visible:ring-[#7C5CFF]";

function AuthDivider() {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs text-white/45">or</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GoogleAuthButton() {
  const { signIn, fetchStatus } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    if (!signIn) return;

    setLoading(true);
    setError(null);

    try {
      const { error: ssoError } = await signIn.sso({
        strategy: "oauth_google" satisfies OAuthStrategy,
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/dashboard",
      });

      if (ssoError) {
        console.error("[auth] Google sign-in failed", ssoError);
        setError("Google sign-in failed. Please try again.");
      }
    } catch (err) {
      console.error("[auth] Google sign-in failed", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || fetchStatus === "fetching";

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        <GoogleIcon />
        {busy ? "Connecting…" : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-[#F87171]">{error}</p> : null}
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Formline" },
      {
        name: "description",
        content: "Sign in to your Formline workspace to build and share forms.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="dark min-h-screen bg-[#0A0A0B] text-[#E5E5E7] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,92,255,0.25),transparent_70%)] pointer-events-none" />
      <div className="relative mx-auto flex flex-col items-center px-6 py-16 max-w-md w-full">
        <Link to="/" className="mb-10 inline-flex items-center">
          <Logo className="h-8" />
        </Link>

        <div className="mb-6 w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {mode === "signin"
              ? "Welcome back. Continue to your Formline workspace."
              : "Get started with forms, client intake, and your dashboard."}
          </p>
        </div>

        {mode === "signin" ? (
          <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
            {!isLoaded ? (
              <div className="flex h-40 w-full items-center justify-center text-sm text-white/50">
                Loading…
              </div>
            ) : (
              <SignInForm />
            )}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="mt-6 text-sm text-white/60 hover:text-white transition-colors"
            >
              Don't have an account? Create one
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
            {!isLoaded ? (
              <div className="flex h-40 w-full items-center justify-center text-sm text-white/50">
                Loading…
              </div>
            ) : (
              <SignUpForm />
            )}
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="mt-6 text-sm text-white/60 hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function completeTicketSignIn(
  signIn: NonNullable<ReturnType<typeof useSignIn>["signIn"]>,
  signInToken: string,
  navigate: ReturnType<typeof useNavigate>,
) {
  const { error: ticketError } = await signIn.ticket({ ticket: signInToken });
  if (ticketError) return false;

  if (signIn.status !== "complete") return false;

  await signIn.finalize({
    navigate: async ({ decorateUrl }) => {
      const url = decorateUrl("/dashboard");
      if (url.startsWith("http")) {
        window.location.href = url;
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    },
  });

  return true;
}

function SignInForm() {
  const navigate = useNavigate();
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as {
        signInToken?: string;
        error?: string;
      };

      if (!response.ok || !payload.signInToken) {
        setError(AUTH_LOGIN_ERROR);
        return;
      }

      const completed = await completeTicketSignIn(signIn, payload.signInToken, navigate);
      if (!completed) {
        setError(AUTH_LOGIN_ERROR);
      }
    } catch {
      setError(AUTH_LOGIN_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-white/10 bg-[#0A0A0B] p-6"
    >
      <GoogleAuthButton />
      <AuthDivider />
      <div className="space-y-2">
        <Label htmlFor="sign-in-email" className="text-white/75">
          Email
        </Label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sign-in-password" className="text-white/75">
          Password
        </Label>
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
      </div>
      {error ? <p className="text-sm text-[#F87171]">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting || fetchStatus === "fetching"}
        className="h-11 w-full rounded-xl bg-[#7C5CFF] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting || fetchStatus === "fetching" ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, displayName }),
      });

      const payload = (await response.json()) as {
        signInToken?: string;
        error?: string;
      };

      if (!response.ok || !payload.signInToken) {
        setError(AUTH_REGISTRATION_ERROR);
        return;
      }

      const completed = await completeTicketSignIn(signIn, payload.signInToken, navigate);
      if (!completed) {
        setError(AUTH_REGISTRATION_ERROR);
      }
    } catch {
      setError(AUTH_REGISTRATION_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-white/10 bg-[#0A0A0B] p-6"
    >
      <GoogleAuthButton />
      <AuthDivider />
      <div className="space-y-2">
        <Label htmlFor="sign-up-display-name" className="text-white/75">
          Display name
        </Label>
        <Input
          id="sign-up-display-name"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sign-up-username" className="text-white/75">
          Username
        </Label>
        <Input
          id="sign-up-username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sign-up-email" className="text-white/75">
          Email
        </Label>
        <Input
          id="sign-up-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sign-up-password" className="text-white/75">
          Password
        </Label>
        <Input
          id="sign-up-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
      </div>
      {error ? <p className="text-sm text-[#F87171]">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting || fetchStatus === "fetching"}
        className="h-11 w-full rounded-xl bg-[#7C5CFF] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting || fetchStatus === "fetching" ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
