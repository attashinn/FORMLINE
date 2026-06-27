import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, useSignIn } from "@clerk/tanstack-react-start";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_LOGIN_ERROR, AUTH_REGISTRATION_ERROR } from "@/lib/auth.constants";

const inputClassName =
  "h-11 border-white/10 bg-[#141418] text-[#F5F5F7] placeholder:text-white/40 focus-visible:ring-[#7C5CFF]";

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

function SignInForm() {
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

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

      const result = await signIn.create({
        strategy: "ticket",
        ticket: payload.signInToken,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      setError(AUTH_LOGIN_ERROR);
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
        disabled={submitting}
        className="h-11 w-full rounded-xl bg-[#7C5CFF] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

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

      const result = await signIn.create({
        strategy: "ticket",
        ticket: payload.signInToken,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      setError(AUTH_REGISTRATION_ERROR);
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
        disabled={submitting}
        className="h-11 w-full rounded-xl bg-[#7C5CFF] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
