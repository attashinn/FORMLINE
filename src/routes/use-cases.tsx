import { createFileRoute } from "@tanstack/react-router";
import { FileText, LayoutTemplate, Sparkles } from "@/components/heroicons";
import { LandingCtaBand, LandingPageHero, LandingShell } from "@/components/landing/landing-shell";
import { useLandingAuth } from "@/lib/landing-auth";

export const Route = createFileRoute("/use-cases")({
  head: () => ({
    meta: [
      { title: "Use Cases — Formline" },
      {
        name: "description",
        content:
          "How design studios, freelancers, and agencies use Formline for client onboarding.",
      },
    ],
  }),
  component: UseCasesPage,
});

function UseCasesPage() {
  const isSignedIn = useLandingAuth();

  return (
    <LandingShell isSignedIn={isSignedIn}>
      <LandingPageHero
        eyebrow="Use cases"
        title="One tool, many workflows."
        description="Whether you run a design studio, freelance practice, or agency — Formline adapts to how you onboard and manage clients."
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Design studios",
                description:
                  "Collect brand guidelines, project scope, and budget in a single intake form. Share one link before the kickoff call.",
              },
              {
                icon: FileText,
                title: "Freelancers",
                description:
                  "Replace scattered Google Forms and email chains. Look professional with branded forms and a clean response inbox.",
              },
              {
                icon: LayoutTemplate,
                title: "Agencies",
                description:
                  "Standardize onboarding across your team. Templates ensure every client provides the same information upfront.",
              },
            ].map((u, i) => (
              <div
                key={u.title}
                className="landing-fade-in rounded-2xl border border-white/10 bg-[#0A0A0B] p-8 text-center"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[#7C5CFF]/10">
                  <u.icon className="size-5 text-[#7C5CFF]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{u.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingCtaBand isSignedIn={isSignedIn} />
    </LandingShell>
  );
}
