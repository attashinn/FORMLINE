import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SignIn, SignUp, useAuth } from "@clerk/tanstack-react-start";
import { Logo } from "@/components/logo";
import { clerkAppearance } from "@/lib/clerk-appearance";

const authProps = {
  routing: "virtual" as const,
  signInUrl: "/auth",
  signUpUrl: "/auth",
  fallbackRedirectUrl: "/dashboard",
  appearance: clerkAppearance,
};

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Formline" },
      { name: "description", content: "Sign in to your Formline workspace to build and share forms." },
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
              <div className="flex h-40 w-full items-center justify-center text-sm text-white/50">Loading…</div>
            ) : (
              <SignIn {...authProps} />
            )}
            <button
              onClick={() => setMode("signup")}
              className="mt-6 text-sm text-white/60 hover:text-white transition-colors"
            >
              Don't have an account? Create one
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
            {!isLoaded ? (
              <div className="flex h-40 w-full items-center justify-center text-sm text-white/50">Loading…</div>
            ) : (
              <SignUp {...authProps} />
            )}
            <button
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
