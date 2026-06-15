import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { Features } from "@/components/blocks/features-10";
import { HeroLogoMarquee } from "@/components/hero-logo-marquee";
import { LandingNavbar } from "@/components/landing-navbar";
import { Logo } from "@/components/logo";
import { ShinyButton } from "@/components/ui/shiny-button";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  FileText,
  FolderOpen,
  Inbox,
  LayoutTemplate,
  Link2,
  Mail,
  Palette,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "@/components/heroicons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Formline — Send forms. Get responses. Stay in control." },
      {
        name: "description",
        content:
          "Build branded intake forms, share them with one link, and collect client responses in a beautifully organized dashboard.",
      },
      { property: "og:title", content: "Formline" },
      { property: "og:image", content: "/formline-brand.png" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { isSignedIn: clerkSignedIn } = useAuth();
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBypassed(document.cookie.includes("bypass=true"));
    }
  }, []);

  const isSignedIn = clerkSignedIn || isBypassed;

  return (
    <div className="dark relative min-h-screen bg-[#0A0A0B] text-[#E5E5E7] antialiased">
      {/* Brand background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[#0A0A0B] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/formline-brand.png)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#0A0A0B]/55 via-[#0A0A0B]/82 to-[#0A0A0B]"
      />

      <LandingNavbar isSignedIn={isSignedIn} />

      {/* hero — PrebuiltUI-style layout, Formline branding */}
      <header className="relative flex flex-col items-center overflow-hidden">
        {/* Side guide lines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex justify-between px-4 md:px-16 lg:px-24 xl:px-32"
        >
          <div className="w-px bg-white/10" />
          <div className="w-px bg-white/10" />
        </div>

        <div className="relative z-10 flex w-full flex-col items-center px-4 pt-16 pb-0 text-center sm:px-6 sm:pt-24 md:px-16 lg:px-24 xl:px-32">
          {/* Badge */}
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-2.5 pr-4">
            <span className="relative flex size-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C5CFF] opacity-60 duration-700" />
              <span className="relative inline-flex size-2 rounded-full bg-[#7C5CFF]" />
            </span>
            <p className="text-xs text-white/70 sm:text-sm">
              Client intake for modern studios
            </p>
          </div>

          {/* Headline */}
          <h1 className="mt-8 max-w-2xl bg-gradient-to-r from-white via-white to-white/45 bg-clip-text text-4xl leading-tight font-semibold tracking-tight text-transparent sm:text-5xl md:text-[4rem]/[1.1]">
            Send forms.
            <br />
            Collect responses.
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-sm font-light text-white/60 sm:text-base">
            Build branded intake forms, share them with one link, and watch responses land in a
            calm, organized workspace.
          </p>

          {/* Keep existing CTAs */}
          <div className="mt-10 flex items-center justify-center gap-3">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7C5CFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#7C5CFF]/25 transition-colors hover:bg-[#7C5CFF]/90"
              >
                Go to Dashboard <ArrowRight className="size-4" />
              </Link>
            ) : (
              <ShinyButton onClick={() => navigate({ to: "/auth" })}>
                Get unlimited access
              </ShinyButton>
            )}
          </div>

          <HeroLogoMarquee />
        </div>

        {/* Divider with corner marks */}
        <div className="relative z-10 mt-12 w-full border-b border-white/10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-[5px] flex justify-between px-4 md:px-16 lg:px-24 xl:px-32"
          >
            <div className="size-2.5 rotate-45 bg-white/80" />
            <div className="size-2.5 rotate-45 bg-white/80" />
          </div>
        </div>

        {/* Dashboard preview — full bleed frame */}
        <div className="relative z-10 w-full px-4 md:px-16 lg:px-24 xl:px-32">
          <div className="flex w-full items-center justify-center bg-white/[0.04] px-4 py-4 pb-8 md:pt-8 md:pb-12">
            <img
              src="/hero-dashboard.png"
              alt="Formline workspace dashboard showing intake trends, form stats, and recent activity"
              className="block h-auto w-full max-w-6xl"
              loading="eager"
            />
          </div>
        </div>
      </header>

      {/* features */}
      <section id="features" className="border-t border-white/5 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7C5CFF]">
              Built for studios
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Everything you need to onboard a client.
            </h2>
            <p className="mt-4 text-white/60">
              No more lost emails, scattered PDFs, or back-and-forth. One link, one inbox, one
              place.
            </p>
          </div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {[
              {
                i: Sparkles,
                t: "Dynamic builder",
                d: "Drag in text, email, select, date, and checkbox fields. Required toggles. No code.",
              },
              {
                i: Link2,
                t: "Shareable links",
                d: "Every form gets a clean public URL. Copy, share, embed — works anywhere.",
              },
              {
                i: Mail,
                t: "Send via email",
                d: "Email the link to a client in one click with a pre-filled message.",
              },
              {
                i: Inbox,
                t: "Unified inbox",
                d: "All responses land in one organized dashboard. Filter, search, export.",
              },
              {
                i: Zap,
                t: "Instant updates",
                d: "Edit a form anytime — the share link stays the same. No reposting required.",
              },
              {
                i: Shield,
                t: "Private by default",
                d: "Only you see responses. Each workspace is fully isolated.",
              },
            ].map((f) => (
              <div key={f.t} className="bg-[#0A0A0B] p-8">
                <f.i className="size-5 text-[#7C5CFF]" />
                <h3 className="mt-5 text-base font-semibold text-white">{f.t}</h3>
                <p className="mt-2 text-sm text-white/55">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Features />

      {/* workspace / client profiles */}
      <section id="workspace" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7C5CFF]">
              Beyond the form
            </span>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              A full client workspace, not just submissions.
            </h2>
            <p className="mt-4 text-white/60">
              Every response becomes a living client profile — with project scope, brand assets,
              internal notes, and activity history in one place.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                i: Users,
                t: "Client profiles",
                d: "Overview, requirements, files, and activity tabs keep every project organized from kickoff to delivery.",
              },
              {
                i: BarChart3,
                t: "Pipeline dashboard",
                d: "Track New, In Progress, and Completed clients. Filter by industry, search by name, and export to CSV.",
              },
              {
                i: ClipboardList,
                t: "Multi-step intake",
                d: "Guided wizard captures company details, goals, brand colors, and project requirements in one flow.",
              },
              {
                i: Palette,
                t: "Brand palette capture",
                d: "Store hex colors and visual references alongside each client so your team stays aligned.",
              },
              {
                i: FolderOpen,
                t: "File management",
                d: "Attach briefs, assets, and deliverables to a client record — no more digging through email threads.",
              },
              {
                i: Search,
                t: "Search & filter",
                d: "Find any client instantly. Switch between table and card views to match how you work.",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6"
              >
                <f.i className="size-5 text-[#7C5CFF]" />
                <h3 className="mt-4 text-base font-semibold text-white">{f.t}</h3>
                <p className="mt-2 text-sm text-white/55">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* use cases */}
      <section id="use-cases" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7C5CFF]">
              Built for you
            </span>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              One tool, many workflows.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">
              Whether you run a design studio, freelance practice, or agency — Formline adapts to
              how you onboard and manage clients.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                i: Sparkles,
                t: "Design studios",
                d: "Collect brand guidelines, project scope, and budget in a single intake form. Share one link before the kickoff call.",
              },
              {
                i: FileText,
                t: "Freelancers",
                d: "Replace scattered Google Forms and email chains. Look professional with branded forms and a clean response inbox.",
              },
              {
                i: LayoutTemplate,
                t: "Agencies",
                d: "Standardize onboarding across your team. Templates ensure every client provides the same information upfront.",
              },
            ].map((u) => (
              <div
                key={u.t}
                className="rounded-2xl border border-white/10 bg-[#0A0A0B] p-8 text-center"
              >
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-[#7C5CFF]/10">
                  <u.i className="size-5 text-[#7C5CFF]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{u.t}</h3>
                <p className="mt-2 text-sm text-white/55">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Three steps. That's it.
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Build",
                d: "Compose your form from clean field primitives. Reorder, set required, add options.",
              },
              {
                n: "02",
                t: "Share",
                d: "Copy the link or send it by email. Your client opens a branded page — no signup needed.",
              },
              {
                n: "03",
                t: "Receive",
                d: "Responses appear in your dashboard with timestamps, ready to review.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6"
              >
                <div className="font-mono text-xs text-[#7C5CFF]">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold text-white">{s.t}</h3>
                <p className="mt-2 text-sm text-white/55">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing / CTA */}
      <section id="pricing" className="relative border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7C5CFF]">
              Pricing
            </span>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Start free. Forever.
            </h2>
            <p className="mt-4 text-white/60">
              Unlimited forms and responses while in beta. No credit card required.
            </p>
          </div>

          <div className="relative mt-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[480px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.22),transparent_70%)] blur-3xl"
            />

            <div className="relative grid gap-10 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Unlimited forms",
                  "Unlimited responses",
                  "Shareable links + email",
                  "Built-in dashboard",
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
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/60">
                  <span className="size-1.5 rounded-full bg-[#7C5CFF]" />
                  Beta access
                </div>
                {isSignedIn ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7C5CFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#7C5CFF]/25 transition-colors hover:bg-[#7C5CFF]/90"
                  >
                    Go to Dashboard <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <ShinyButton onClick={() => navigate({ to: "/auth" })}>
                    Create your workspace
                  </ShinyButton>
                )}
                <p className="text-xs text-white/40">Free while in beta · cancel anytime</p>
              </div>
            </div>

            <div className="relative border-t border-white/10 px-8 py-4 md:px-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-[5px] flex justify-between px-8 md:px-12"
              >
                <div className="size-2 rotate-45 bg-white/60" />
                <div className="size-2 rotate-45 bg-white/60" />
              </div>
              <p className="text-center text-xs text-white/45">
                Everything included — forms, responses, client workspace, and email delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-white/40">
          <Logo className="h-5 opacity-60" />
          <div>Crafted with care.</div>
        </div>
      </footer>
    </div>
  );
}
