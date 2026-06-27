import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, LayoutTemplate, Send, Users } from "@/components/heroicons";
import { LandingCtaBand, LandingPageHero, LandingShell } from "@/components/landing/landing-shell";
import { useLandingAuth } from "@/lib/landing-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Formline" },
      {
        name: "description",
        content: "Launch client intake, feedback, RSVP, and hiring forms from polished templates.",
      },
    ],
  }),
  component: TemplatesPage,
});

const TEMPLATES = [
  { title: "Client intake", fields: 7, tag: "Most popular" },
  { title: "Project feedback", fields: 5, tag: "Creative" },
  { title: "Contact request", fields: 4, tag: "Lead gen" },
  { title: "Hiring brief", fields: 6, tag: "Agency" },
  { title: "Event RSVP", fields: 5, tag: "Events" },
  { title: "Brand questionnaire", fields: 8, tag: "Branding" },
];

function TemplatesPage() {
  const isSignedIn = useLandingAuth();

  return (
    <LandingShell isSignedIn={isSignedIn}>
      <LandingPageHero
        eyebrow="Templates"
        title="Launch intake without rebuilding the same form twice."
        description="Start with proven onboarding flows, tailor the fields, and route every response into the client workspace your team already uses."
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((t, i) => (
              <div
                key={t.title}
                className="landing-fade-in rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#7C5CFF]/40 hover:bg-[#7C5CFF]/5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <LayoutTemplate className="size-5 shrink-0 text-[#7C5CFF]" />
                  <span className="rounded-full bg-[#7C5CFF]/15 px-2 py-0.5 text-[10px] font-medium text-[#B8AAFF]">
                    {t.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-white">{t.title}</h3>
                <p className="mt-1 text-sm text-white/50">{t.fields} fields · ready to publish</p>
              </div>
            ))}
          </div>

          <div className="landing-fade-in mt-16 flex flex-wrap justify-center gap-8 md:gap-12">
            {[
              { icon: ClipboardList, label: "Intake" },
              { icon: Send, label: "Share" },
              { icon: LayoutTemplate, label: "Collect" },
              { icon: Users, label: "Profile" },
            ].map((step, i) => (
              <div key={step.label} className="text-center">
                <div
                  className={cn(
                    "mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]",
                    i === 0 && "border-[#7C5CFF]/50 shadow-[0_0_24px_rgba(124,92,255,0.2)]",
                  )}
                >
                  <step.icon className="size-6 text-[#7C5CFF]" />
                </div>
                <p className="mt-2 text-sm text-white/55">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingCtaBand isSignedIn={isSignedIn} />
    </LandingShell>
  );
}
