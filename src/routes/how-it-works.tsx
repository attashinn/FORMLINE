import { createFileRoute } from "@tanstack/react-router";
import { LandingCtaBand, LandingPageHero, LandingShell } from "@/components/landing/landing-shell";
import { useLandingAuth } from "@/lib/landing-auth";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Formline" },
      {
        name: "description",
        content: "Build your form, share a link, and receive responses in your dashboard.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    n: "01",
    title: "Build",
    description:
      "Compose your form from clean field primitives. Reorder, set required, add options.",
  },
  {
    n: "02",
    title: "Share",
    description:
      "Copy the link or send it by email. Your client opens a branded page — no signup needed.",
  },
  {
    n: "03",
    title: "Receive",
    description: "Responses appear in your dashboard with timestamps, ready to review.",
  },
];

function HowItWorksPage() {
  const isSignedIn = useLandingAuth();

  return (
    <LandingShell isSignedIn={isSignedIn}>
      <LandingPageHero
        eyebrow="How it works"
        title="Three steps. That's it."
        description="From blank canvas to client responses in minutes — no complex setup, no learning curve."
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="landing-fade-in relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-8"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="font-mono text-sm text-[#7C5CFF]">{s.n}</div>
                <h3 className="mt-4 text-2xl font-semibold text-white">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{s.description}</p>
                {i < STEPS.length - 1 ? (
                  <div
                    aria-hidden
                    className="absolute -right-4 top-1/2 hidden h-px w-8 bg-gradient-to-r from-[#7C5CFF]/50 to-transparent md:block"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingCtaBand isSignedIn={isSignedIn} />
    </LandingShell>
  );
}
