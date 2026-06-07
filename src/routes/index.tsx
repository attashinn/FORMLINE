import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Features } from "@/components/blocks/features-10";
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
      { property: "og:description", content: "Send forms. Get responses. Stay in control." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen bg-[#0A0A0B] text-[#E5E5E7] antialiased">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#templates" className="hover:text-white">
              Templates
            </a>
            <a href="#workspace" className="hover:text-white">
              Workspace
            </a>
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-white/70 hover:text-white">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-black hover:bg-white/90"
            >
              Start free <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.35),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C5CFF]/50 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-32 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#7C5CFF] shadow-[0_0_8px_#7C5CFF]" />
            New — Send forms via shareable link or email
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">
            Send forms.
            <br />
            <span className="bg-gradient-to-r from-white via-white to-[#7C5CFF] bg-clip-text text-transparent">
              Collect responses.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-white/60 md:text-lg">
            The intake workspace for modern studios. Build a form in minutes, share a link, and
            watch responses land in a calm, organized dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <ShinyButton onClick={() => navigate({ to: "/auth" })}>
              Get unlimited access
            </ShinyButton>
          </div>

          <div className="relative mx-auto mt-20 max-w-6xl">
            <div className="absolute -inset-x-10 -top-8 h-72 bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.3),transparent_68%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-[0_34px_140px_-34px_rgba(124,92,255,0.55)]">
              <img
                src="/hero-dashboard.svg"
                alt="Formline clients dashboard showing active partnerships, client metrics, filters, and a partner table"
                className="block w-full rounded-xl border border-white/5 bg-[#0A0A0B]"
                loading="eager"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A0A0B] to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7C5CFF]">
              Built for studios
            </span>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
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
      <section id="pricing" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Start free. Forever.
          </h2>
          <p className="mt-4 text-white/60">
            Unlimited forms and responses while in beta. No credit card.
          </p>
          <ul className="mx-auto mt-8 inline-flex flex-col items-start gap-2 text-sm text-white/70">
            {[
              "Unlimited forms",
              "Unlimited responses",
              "Shareable links + email",
              "Built-in dashboard",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-4 text-[#7C5CFF]" /> {f}
              </li>
            ))}
          </ul>
          <Link
            to="/auth"
            className="mt-10 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-medium text-black hover:opacity-90"
          >
            Create your workspace <ArrowRight className="size-4" />
          </Link>
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
