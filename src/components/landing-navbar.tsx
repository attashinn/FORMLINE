import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Workspace", href: "#workspace" },
  { label: "Use cases", href: "#use-cases" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
] as const;

function ArrowIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M.6 4.602h10m-4-4 4 4-4 4"
        stroke="#3f3f47"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LandingNavbarProps = {
  isSignedIn: boolean;
};

export function LandingNavbar({ isSignedIn }: LandingNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>(NAV_ITEMS[0].href);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((open) => !open);
  }

  const cta = isSignedIn ? (
    <Link
      to="/dashboard"
      onClick={closeMenu}
      className="flex items-center gap-2.5 bg-linear-to-r from-[#7C5CFF] to-[#5B3FD9] text-white hover:text-white/90 text-sm font-medium pl-5 pr-2 py-2 rounded-full transition-colors"
    >
      Dashboard
      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
        <ArrowIcon />
      </span>
    </Link>
  ) : (
    <Link
      to="/auth"
      onClick={closeMenu}
      className="flex items-center gap-2.5 bg-linear-to-r from-[#7C5CFF] to-[#5B3FD9] text-white hover:text-white/90 text-sm font-medium pl-5 pr-2 py-2 rounded-full transition-colors"
    >
      Get started
      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
        <ArrowIcon />
      </span>
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 lg:px-24 xl:px-40 py-4 flex items-center justify-between relative">
      <Link to="/" className="flex items-center shrink-0" onClick={closeMenu}>
        <Logo />
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-1 py-1 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeHref === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setActiveHref(item.href)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm transition-colors",
                isActive
                  ? "bg-white/10 border border-white/15 font-medium text-white"
                  : "text-white/50 hover:text-white/70",
              )}
            >
              {item.label}
            </a>
          );
        })}
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-4">
        {!isSignedIn && (
          <Link to="/auth" className="text-sm text-white/60 hover:text-white transition-colors">
            Sign in
          </Link>
        )}
        {cta}
      </div>

      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={toggleMenu}
        className="md:hidden flex flex-col gap-1.5 cursor-pointer bg-transparent border-0 p-1"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        <span
          className={cn(
            "block w-6 h-0.5 bg-white/80 transition-transform origin-center",
            menuOpen && "rotate-45 translate-y-2",
          )}
        />
        <span
          className={cn(
            "block w-6 h-0.5 bg-white/80 transition-opacity",
            menuOpen && "opacity-0",
          )}
        />
        <span
          className={cn(
            "block w-6 h-0.5 bg-white/80 transition-transform origin-center",
            menuOpen && "-rotate-45 -translate-y-2",
          )}
        />
      </button>

      {/* Mobile menu */}
      <div
        className={cn(
          "absolute top-full left-0 w-full bg-[#0A0A0B] border-t border-white/10 flex-col p-5 gap-1 md:hidden z-50",
          menuOpen ? "flex" : "hidden",
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeHref === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => {
                setActiveHref(item.href);
                closeMenu();
              }}
              className={cn(
                "block px-4 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70",
              )}
            >
              {item.label}
            </a>
          );
        })}
        {!isSignedIn && (
          <Link
            to="/auth"
            onClick={closeMenu}
            className="block px-4 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            Sign in
          </Link>
        )}
        <div className="mt-3">{cta}</div>
      </div>
    </nav>
  );
}
