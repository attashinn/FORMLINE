import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/tanstack-react-start";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const isActive = (p: string) => pathname.startsWith(p);

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={
        "text-sm tracking-tight transition-colors " +
        (isActive(to) ? "text-foreground" : "text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </Link>
  );

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {link("/dashboard", "Clients")}
          {link("/forms", "Forms")}
          {link("/intake", "Intake")}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/forms"
            className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-medium text-black shadow-[0_0_24px_-6px_rgba(124,92,255,0.6)] transition-opacity hover:opacity-90"
          >
            New form
          </Link>
          <button onClick={handleSignOut} className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
