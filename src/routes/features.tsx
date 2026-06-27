import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Link2, Mail, Shield, Sparkles, Zap } from "@/components/heroicons";
import {
  LandingCtaBand,
  LandingFeatureGrid,
  LandingPageHero,
  LandingShell,
} from "@/components/landing/landing-shell";
import { useLandingAuth } from "@/lib/landing-auth";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Formline" },
      {
        name: "description",
        content:
          "Dynamic form builder, shareable links, unified inbox, and private client workspaces.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const isSignedIn = useLandingAuth();

  return (
    <LandingShell isSignedIn={isSignedIn}>
      <LandingPageHero
        eyebrow="Features"
        title={
          <>
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-[#7C5CFF] to-[#B8AAFF] bg-clip-text text-transparent">
              onboard clients
            </span>
          </>
        }
        description="No more lost emails, scattered PDFs, or back-and-forth. One link, one inbox, one workspace built for modern studios."
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <LandingFeatureGrid
            items={[
              {
                icon: <Sparkles className="size-5" />,
                title: "Dynamic builder",
                description:
                  "Drag in text, email, select, date, and checkbox fields. Required toggles. No code.",
              },
              {
                icon: <Link2 className="size-5" />,
                title: "Shareable links",
                description:
                  "Every form gets a clean public URL. Copy, share, embed — works anywhere.",
              },
              {
                icon: <Mail className="size-5" />,
                title: "Send via email",
                description: "Email the link to a client in one click with a pre-filled message.",
              },
              {
                icon: <Inbox className="size-5" />,
                title: "Unified inbox",
                description:
                  "All responses land in one organized dashboard. Filter, search, export.",
              },
              {
                icon: <Zap className="size-5" />,
                title: "Instant updates",
                description:
                  "Edit a form anytime — the share link stays the same. No reposting required.",
              },
              {
                icon: <Shield className="size-5" />,
                title: "Private by default",
                description: "Only you see responses. Each workspace is fully isolated.",
              },
            ]}
          />
        </div>
      </section>

      <LandingCtaBand isSignedIn={isSignedIn} />
    </LandingShell>
  );
}
