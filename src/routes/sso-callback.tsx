import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HandleSSOCallback } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sso-callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Signing in — Formline" }],
  }),
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center gap-3 px-6">
      <p className="text-sm text-white/60">Completing sign in…</p>
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          const url = decorateUrl("/dashboard");
          if (url.startsWith("http")) {
            window.location.href = url;
            return;
          }
          navigate({ to: "/dashboard", replace: true });
        }}
        navigateToSignIn={() => navigate({ to: "/auth", replace: true })}
        navigateToSignUp={() => navigate({ to: "/auth", replace: true })}
      />
      <div id="clerk-captcha" />
    </div>
  );
}
