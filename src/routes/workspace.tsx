import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  FolderOpen,
  Palette,
  Search,
  Users,
} from "@/components/heroicons";
import {
  LandingCtaBand,
  LandingFeatureGrid,
  LandingPageHero,
  LandingShell,
} from "@/components/landing/landing-shell";
import { useLandingAuth } from "@/lib/landing-auth";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — Formline" },
      {
        name: "description",
        content:
          "A full client workspace with profiles, pipeline dashboard, files, and activity history.",
      },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const isSignedIn = useLandingAuth();

  return (
    <LandingShell isSignedIn={isSignedIn}>
      <LandingPageHero
        eyebrow="Workspace"
        title={
          <>
            A full client workspace,{" "}
            <span className="italic text-white/70">not just submissions.</span>
          </>
        }
        description="Every response becomes a living client profile — with project scope, brand assets, internal notes, and activity history in one place."
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <img
              src="/hero-dashboard.png"
              alt="Formline workspace dashboard"
              className="w-full rounded-xl"
              loading="lazy"
            />
          </div>
          <LandingFeatureGrid
            items={[
              {
                icon: <Users className="size-5" />,
                title: "Client profiles",
                description:
                  "Overview, requirements, files, and activity tabs keep every project organized from kickoff to delivery.",
              },
              {
                icon: <BarChart3 className="size-5" />,
                title: "Pipeline dashboard",
                description:
                  "Track New, In Progress, and Completed clients. Filter by industry and export to CSV.",
              },
              {
                icon: <ClipboardList className="size-5" />,
                title: "Multi-step intake",
                description:
                  "Guided wizard captures company details, goals, brand colors, and project requirements.",
              },
              {
                icon: <Palette className="size-5" />,
                title: "Brand palette capture",
                description: "Store hex colors and visual references alongside each client.",
              },
              {
                icon: <FolderOpen className="size-5" />,
                title: "File management",
                description:
                  "Attach briefs, assets, and deliverables — no more digging through email.",
              },
              {
                icon: <Search className="size-5" />,
                title: "Search & filter",
                description: "Find any client instantly. Switch between table and card views.",
              },
            ]}
          />
        </div>
      </section>

      <LandingCtaBand isSignedIn={isSignedIn} />
    </LandingShell>
  );
}
