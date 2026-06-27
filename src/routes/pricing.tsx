import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "@/components/heroicons";
import { LandingPageHero, LandingShell } from "@/components/landing/landing-shell";
import { ShinyButton } from "@/components/ui/shiny-button";
import { useLandingAuth } from "@/lib/landing-auth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Formline" },
      {
        name: "description",
        content: "Start free during beta. Unlimited forms, responses, and workspace features.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const isSignedIn = useLandingAuth();

  return (
    <LandingShell isSignedIn={isSignedIn}>
      <LandingPageHero
        eyebrow="Pricing"
        title="Start free. Forever."
        description="Unlimited forms and responses while in beta. No credit card required."
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="landing-fade-in relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[480px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.22),transparent_70%)] md:blur-3xl"
            />

            <div className="relative grid gap-10 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Unlimited forms",
                  "Unlimited responses",
                  "Shareable links + email",
                  "Client workspace",
                  "Invoices & billing",
                  "Automations",
                ].map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3.5"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#7C5CFF]/15">
                      <Check className="size-3.5 text-[#7C5CFF]" />
                    </span>
                    <span className="text-sm text-white/80">{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-start gap-4 md:items-end md:text-right">
                <div className="font-serif text-5xl text-white">$0</div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/60">
                  <span className="size-1.5 rounded-full bg-[#7C5CFF]" />
                  Beta access
                </div>
                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex h-11 items-center rounded-xl bg-[#7C5CFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#7C5CFF]/25 transition hover:bg-[#7C5CFF]/90"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link to="/auth">
                    <ShinyButton>Create your workspace</ShinyButton>
                  </Link>
                )}
                <p className="text-xs text-white/40">Free while in beta · cancel anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
