import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LandingNavbar } from "@/components/landing-navbar";
import { Logo } from "@/components/logo";

type LandingShellProps = {
  children: ReactNode;
  isSignedIn: boolean;
};

export function LandingShell({ children, isSignedIn }: LandingShellProps) {
  return (
    <div className="dark relative min-h-screen bg-[#0A0A0B] text-[#E5E5E7] antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[#0A0A0B] bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: "url(/formline-brand.png)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0A0A0B]/55 via-[#0A0A0B]/88 to-[#0A0A0B]"
      />
      <LandingNavbar isSignedIn={isSignedIn} />
      {children}
      <LandingFooter />
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <Logo className="h-5 opacity-60" />
        <div className="flex flex-wrap gap-4">
          {[
            { label: "Features", to: "/features" },
            { label: "Templates", to: "/templates" },
            { label: "Pricing", to: "/pricing" },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-white/70 transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
        <div>Crafted with care.</div>
      </div>
    </footer>
  );
}

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
};

export function LandingPageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <header className="relative overflow-hidden border-b border-white/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-20%,rgba(124,92,255,0.35),transparent_65%)]"
      />
      <div className="landing-fade-in relative mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#7C5CFF]">
          {eyebrow}
        </span>
        <h1 className="mt-4 max-w-3xl font-semibold tracking-tight text-white text-4xl md:text-6xl md:leading-[1.05]">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-base text-white/60 md:text-lg">{description}</p>
      </div>
    </header>
  );
}

type FeatureGridProps = {
  items: { title: string; description: string; icon?: ReactNode }[];
};

export function LandingFeatureGrid({ items }: FeatureGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={item.title}
          className="landing-fade-in group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 transition-colors hover:border-[#7C5CFF]/40 hover:from-[#7C5CFF]/10"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {item.icon ? <div className="mb-4 text-[#7C5CFF]">{item.icon}</div> : null}
          <h3 className="text-base font-semibold text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function LandingCtaBand({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="border-t border-white/5 py-20">
      <div className="landing-fade-in mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#7C5CFF]/20 via-white/[0.03] to-transparent p-10 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#7C5CFF]/20 md:blur-3xl"
          />
          <h2 className="relative max-w-xl text-2xl font-semibold text-white md:text-3xl">
            Ready to streamline client intake?
          </h2>
          <p className="relative mt-3 max-w-lg text-sm text-white/60">
            Build forms, share links, and manage every response in one calm workspace.
          </p>
          <div className="relative mt-8">
            <Link
              to={isSignedIn ? "/dashboard" : "/auth"}
              className="inline-flex h-11 items-center rounded-xl bg-[#7C5CFF] px-6 text-sm font-semibold text-white shadow-lg shadow-[#7C5CFF]/25 transition hover:bg-[#7C5CFF]/90"
            >
              {isSignedIn ? "Go to Dashboard" : "Get started free"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
