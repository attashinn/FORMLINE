import { useState, useEffect } from "react";
import { createFileRoute, Outlet, redirect, useRouterState, useNavigate, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { useClerk } from "@clerk/tanstack-react-start";
import { useAuth } from "@/hooks/use-auth";
import { ClientsProvider } from "@/lib/clients-store";
import { Logo } from "@/components/logo";
import { Bars3, X, Users, FileText, ClipboardList, LogOut, Plus, LayoutGrid, Mail, BarChart3, Settings, Zap } from "@/components/heroicons";
import { AnimatePresence, motion } from "framer-motion";
import { DevBypassBanner } from "@/components/dev-bypass-banner";
import { UserAvatar } from "@/components/user-avatar";
import { DEV_BYPASS_OWNER_ID } from "@/lib/dev-bypass";

const getAuthUser = createServerFn({ method: "GET" }).handler(async () => {
  if (process.env.NODE_ENV === "development") {
    try {
      const { getRequestUrl, getCookie } = await import("@tanstack/react-start/server");
      const url = getRequestUrl();
      const bypassCookie = getCookie("bypass");
      if (url.searchParams.get("bypass") === "true" || bypassCookie === "true") {
        return { userId: DEV_BYPASS_OWNER_ID };
      }
    } catch (e) {
      console.warn("Failed to get request context inside dev bypass:", e);
    }
  }
  const { userId } = await auth();
  if (!userId) {
    throw redirect({ to: "/auth" });
  }
  return { userId };
});

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useAuth();

  const isActive = (to: string) => {
    if (to === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (to === "/clients") {
      return pathname === "/clients" || pathname.startsWith("/clients/");
    }
    return pathname.startsWith(to);
  };

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  const fullName = user?.user_metadata?.full_name || user?.email || "User";
  const email = user?.email || "";

  const sections = [
    {
      title: "Workspace",
      items: [
        { to: "/dashboard",    label: "Dashboard",    icon: LayoutGrid },
        { to: "/analytics",    label: "Analytics",    icon: BarChart3  },
        { to: "/automations",  label: "Automations",  icon: Zap        },
        { to: "/clients",      label: "Clients",      icon: Users      },
      ],
    },
    {
      title: "Intake Tools",
      items: [
        { to: "/forms", label: "Forms", icon: FileText },
        { to: "/responses", label: "Responses", icon: ClipboardList },
        { to: "/intake", label: "New Intake", icon: Plus },
      ],
    },
    {
      title: "Communications",
      items: [
        { to: "/emails", label: "Emails", icon: Mail },
      ],
    },
    {
      title: "Account",
      items: [
        { to: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-surface-muted/30">
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <div className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((link) => {
                const active = isActive(link.to);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                      active
                        ? "bg-[#7C5CFF]/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#7C5CFF]" />
                    )}
                    <Icon
                      className={`size-4.5 transition-colors ${
                        active ? "text-[#7C5CFF]" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* CTA section inside navigation */}
        <div className="pt-4 border-t border-hairline">
          <Link
            to="/intake"
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold transition-opacity hover:opacity-90 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          >
            <Plus className="size-4" /> Start Intake
          </Link>
        </div>
      </nav>

      {/* Profile area */}
      <div className="border-t border-hairline p-4 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/profile"
            onClick={onClose}
            className={`flex-1 flex items-center gap-3 min-w-0 p-1.5 rounded-xl transition-all group ${
              pathname === "/profile"
                ? "bg-[#7C5CFF]/10 ring-1 ring-[#7C5CFF]/20"
                : "hover:bg-white/5"
            }`}
          >
            <UserAvatar
              name={fullName}
              email={email}
              imageUrl={user?.imageUrl}
              className="size-9 text-sm"
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-foreground group-hover:text-white transition-colors">{fullName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{email}</div>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-30 border-r border-hairline bg-surface/40 backdrop-blur-lg">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-hairline">
          <Link to="/dashboard" className="flex items-center">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 min-h-screen">
        <DevBypassBanner />
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center justify-between h-16 px-4 border-b border-hairline bg-surface/40 backdrop-blur-lg sticky top-0 z-40">
          <Link to="/dashboard" className="flex items-center">
            <Logo />
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-hairline"
            aria-label="Toggle navigation"
          >
            <Bars3 className="size-5" />
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-hairline z-50 md:hidden flex flex-col"
              >
                <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-hairline">
                  <Logo />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-hairline"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <SidebarContent onClose={() => setMobileOpen(false)} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content Outlet */}
        <main className="flex-1 flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    return await getAuthUser();
  },
  component: () => (
    <ClientsProvider>
      <AuthenticatedLayout />
    </ClientsProvider>
  ),
});
