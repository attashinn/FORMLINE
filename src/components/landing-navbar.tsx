import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { ArrowRight, X } from "@/components/heroicons";

const NAV_ITEMS = [
  { label: "Features", to: "/features" as const, desc: "Form builder & inbox" },
  { label: "Templates", to: "/templates" as const, desc: "Ready-made flows" },
  { label: "Workspace", to: "/workspace" as const, desc: "Client profiles" },
  { label: "Use cases", to: "/use-cases" as const, desc: "Studios & agencies" },
  { label: "How it works", to: "/how-it-works" as const, desc: "Build, share, receive" },
  { label: "Pricing", to: "/pricing" as const, desc: "Free during beta" },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const cta = isSignedIn ? (
    <Link
      to="/dashboard"
      onClick={closeMenu}
      className="flex w-full items-center justify-center gap-2.5 bg-linear-to-r from-[#7C5CFF] to-[#5B3FD9] text-white hover:text-white/90 text-sm font-semibold pl-5 pr-2 py-3 rounded-xl transition-colors lg:w-auto lg:rounded-full lg:py-2"
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
      className="flex w-full items-center justify-center gap-2.5 bg-linear-to-r from-[#7C5CFF] to-[#5B3FD9] text-white hover:text-white/90 text-sm font-semibold pl-5 pr-2 py-3 rounded-xl transition-colors lg:w-auto lg:rounded-full lg:py-2"
    >
      Get started
      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
        <ArrowIcon />
      </span>
    </Link>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#0A0A0B]/95 md:bg-[#0A0A0B]/80 md:backdrop-blur-xl border-b border-white/5 px-6 md:px-12 lg:px-24 xl:px-40 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0" onClick={closeMenu}>
          <Logo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-full px-1 py-1 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 xl:px-4 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-white/10 border border-white/15 font-medium text-white"
                    : "text-white/50 hover:text-white/70",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-4">
          {!isSignedIn && (
            <Link to="/auth" className="text-sm text-white/60 hover:text-white transition-colors">
              Sign in
            </Link>
          )}
          {cta}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="lg:hidden flex items-center justify-center size-10 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
            <path
              d="M1 1h16M1 7h16M1 13h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/70 lg:hidden"
              onClick={closeMenu}
              aria-hidden
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0A0A0B] lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <Logo />
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                  Product
                </p>
                <ul className="space-y-0.5">
                  {NAV_ITEMS.map((item, i) => {
                    const isActive = pathname === item.to;
                    return (
                      <motion.li
                        key={item.to}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 + i * 0.04 }}
                      >
                        <Link
                          to={item.to}
                          onClick={closeMenu}
                          className={cn(
                            "group flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors",
                            isActive
                              ? "bg-[#7C5CFF]/15 ring-1 ring-[#7C5CFF]/25"
                              : "hover:bg-white/5",
                          )}
                        >
                          <div className="min-w-0">
                            <span
                              className={cn(
                                "block text-sm font-medium",
                                isActive ? "text-white" : "text-white/80 group-hover:text-white",
                              )}
                            >
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-white/40">{item.desc}</span>
                          </div>
                          <ArrowRight
                            className={cn(
                              "size-4 shrink-0 transition-transform",
                              isActive
                                ? "text-[#7C5CFF]"
                                : "text-white/25 group-hover:translate-x-0.5 group-hover:text-white/50",
                            )}
                          />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* Drawer footer */}
              <div className="border-t border-white/10 bg-gradient-to-t from-[#7C5CFF]/10 to-transparent p-5 space-y-3">
                {!isSignedIn && (
                  <Link
                    to="/auth"
                    onClick={closeMenu}
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Sign in
                  </Link>
                )}
                {cta}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
