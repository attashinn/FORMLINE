import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useClients, formatRelative, type ClientStatus } from "@/lib/clients-store";
import { listForms } from "@/lib/forms.functions";
import {
  FileText,
  Plus,
  ArrowUpRight,
  Sparkles,
  Users,
  LayoutGrid,
} from "@/components/heroicons";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Client Profile Hub" },
      {
        name: "description",
        content: "All active client partnerships, intake status, and pipeline at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function statusChip(status: ClientStatus) {
  const map: Record<ClientStatus, string> = {
    New: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
    "In Progress": "bg-white/10 text-white/80 ring-white/15",
    Completed: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 " +
        map[status]
      }
    >
      {status}
    </span>
  );
}

function Dashboard() {
  const { clients, isLoading } = useClients();
  const list = useServerFn(listForms);

  const {
    data: forms = [],
    isLoading: formsLoading,
    isError: formsError,
  } = useQuery({
    queryKey: ["forms"],
    queryFn: () => list(),
    retry: 1,
    staleTime: 0,
  });

  const stats = useMemo(() => {
    const open = clients.filter((c) => c.status !== "Completed").length;
    const newCount = clients.filter((c) => c.status === "New").length;
    const progressCount = clients.filter((c) => c.status === "In Progress").length;
    const completedCount = clients.filter((c) => c.status === "Completed").length;
    return {
      total: clients.length,
      open,
      newCount,
      progressCount,
      completedCount,
    };
  }, [clients]);

  // Take the 4 most recently updated clients
  const recentClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [clients]);

  // Hardcoded coordinates for our premium SVG Line/Area graph
  // Data points: Jan (1), Feb (3), Mar (2), Apr (5), May (4), Jun (7)
  const chartPoints = [
    { label: "Jan", val: 1, x: 50, y: 190 },
    { label: "Feb", val: 3, x: 140, y: 150 },
    { label: "Mar", val: 2, x: 230, y: 170 },
    { label: "Apr", val: 5, x: 320, y: 110 },
    { label: "May", val: 4, x: 410, y: 130 },
    { label: "Jun", val: 7, x: 500, y: 70 },
  ];

  // Bezier curve string
  const strokePath = "M 50 190 C 95 170, 95 150, 140 150 C 185 150, 185 170, 230 170 C 275 170, 275 110, 320 110 C 365 110, 365 130, 410 130 C 455 130, 455 70, 500 70";
  const fillPath = `${strokePath} L 500 220 L 50 220 Z`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[520px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.28),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 sm:mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
              The workspace
            </span>
            <h1 className="font-serif text-3xl leading-[1.05] text-balance sm:text-4xl md:text-5xl lg:text-6xl">
              Workspace <span className="italic text-muted-foreground">overview</span>
            </h1>
            <p className="max-w-[58ch] text-pretty text-muted-foreground">
              Monitor form submissions, analyze intake trends, and oversee creative project lifecycles at a single glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/intake"
              className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background ring-1 ring-foreground transition-colors hover:bg-foreground/90"
            >
              Start Intake
            </Link>
          </div>
        </motion.section>

        {/* Stats strip */}
        <section className="mb-8 sm:mb-10 grid grid-cols-2 divide-hairline rounded-2xl bg-surface ring-1 ring-hairline md:grid-cols-4 divide-x [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-hairline md:[&>*:nth-child(n+3)]:border-t-0">
          {[
            { label: "Your forms", value: formsLoading ? "…" : forms.length },
            {
              label: "Published forms",
              value: formsLoading ? "…" : forms.filter((f) => f.is_published).length,
            },
            { label: "Total clients", value: isLoading ? "…" : stats.total },
            { label: "Open engagements", value: isLoading ? "…" : stats.open },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="px-4 py-4 sm:px-6 sm:py-5"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 font-serif text-4xl leading-none">{s.value}</div>
            </motion.div>
          ))}
        </section>

        {/* Graph Section */}
        <section className="mb-8 sm:mb-10 grid gap-4 sm:gap-6 md:grid-cols-3">
          {/* Intake Trends Line Chart */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="size-4 text-[#7C5CFF]" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                  Intake Trends
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Onboarded clients count over the last 6 months.
              </p>
            </div>

            {/* Line/Area SVG chart */}
            <div className="my-6 relative w-full h-[230px] overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 550 250" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8C70FF" />
                    <stop offset="100%" stopColor="#6C4AFF" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="50" y1="70" x2="500" y2="70" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="50" y1="110" x2="500" y2="110" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="50" y1="150" x2="500" y2="150" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="50" y1="190" x2="500" y2="190" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="50" y1="220" x2="500" y2="220" stroke="var(--color-border)" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="32" y="74" fill="var(--color-muted-foreground)" fontSize="10" textAnchor="end">8</text>
                <text x="32" y="114" fill="var(--color-muted-foreground)" fontSize="10" textAnchor="end">5</text>
                <text x="32" y="154" fill="var(--color-muted-foreground)" fontSize="10" textAnchor="end">3</text>
                <text x="32" y="194" fill="var(--color-muted-foreground)" fontSize="10" textAnchor="end">1</text>

                {/* Area Fill */}
                <path d={fillPath} fill="url(#areaGrad)" />

                {/* Path Line */}
                <path d={strokePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />

                {/* Data Points Glow circles */}
                {chartPoints.map((pt, index) => (
                  <g key={pt.label}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="7"
                      fill="#7C5CFF"
                      fillOpacity="0.25"
                      className="transition-all duration-300 hover:r-9"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#FFFFFF"
                      stroke="#7C5CFF"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.x}
                      y="242"
                      fill="var(--color-muted-foreground)"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      {pt.label}
                    </text>
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      fill="var(--color-foreground)"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.val}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Status Breakdown Panel */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="size-4 text-[#7C5CFF]" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                  Status Breakdown
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Distribution of client engagement statuses.
              </p>
            </div>

            {/* Custom progress bars */}
            <div className="space-y-6 my-auto pt-4">
              {[
                {
                  label: "New",
                  count: stats.newCount,
                  percent: stats.total ? Math.round((stats.newCount / stats.total) * 100) : 0,
                  color: "bg-amber-500",
                  textColor: "text-amber-300",
                },
                {
                  label: "In Progress",
                  count: stats.progressCount,
                  percent: stats.total ? Math.round((stats.progressCount / stats.total) * 100) : 0,
                  color: "bg-blue-500",
                  textColor: "text-blue-300",
                },
                {
                  label: "Completed",
                  count: stats.completedCount,
                  percent: stats.total ? Math.round((stats.completedCount / stats.total) * 100) : 0,
                  color: "bg-emerald-500",
                  textColor: "text-emerald-300",
                },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden ring-1 ring-hairline">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* View all clients shortcut link */}
            <div className="border-t border-hairline pt-4 mt-2">
              <Link
                to="/clients"
                className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View all active client profiles</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Workspace Activity Feed */}
        <section className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Forms summary */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Your forms
                  </h2>
                </div>
                <Link
                  to="/forms"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
            </div>

            {formsLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground flex-1 flex items-center justify-center">
                Loading forms…
              </div>
            ) : formsError ? (
              <div className="py-10 text-center flex-1 flex flex-col items-center justify-center">
                <p className="font-medium text-sm">Couldn&apos;t load your forms</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="py-10 text-center flex-1 flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">No forms created yet.</p>
                <Link
                  to="/forms"
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background"
                >
                  <Plus className="size-3.5" /> Create Form
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-hairline overflow-hidden rounded-2xl bg-surface-muted/50 ring-1 ring-hairline flex-1">
                {forms.slice(0, 4).map((form) => (
                  <li
                    key={form.id}
                    className="group relative flex items-center justify-between px-4 py-3.5 hover:bg-[#7C5CFF]/5"
                  >
                    <Link
                      to="/forms/$id"
                      params={{ id: form.id }}
                      className="absolute inset-0 z-0"
                      aria-label={`Open ${form.title}`}
                    />
                    <div className="pointer-events-none relative z-10">
                      <div className="font-medium text-sm">{form.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {form.fields.length} fields · {form.is_published ? "Published" : "Draft"} ·
                        Updated {new Date(form.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="relative z-10 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-[#7C5CFF]">
                      Open <ArrowUpRight className="size-3" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent client signups */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Recent Activity
                  </h2>
                </div>
                <Link
                  to="/clients"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground flex-1 flex items-center justify-center">
                Loading activity…
              </div>
            ) : clients.length === 0 ? (
              <div className="py-10 text-center flex-1 flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">No client partners yet.</p>
                <Link
                  to="/intake"
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background"
                >
                  <Plus className="size-3.5" /> Start Intake
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-hairline overflow-hidden rounded-2xl bg-surface-muted/50 ring-1 ring-hairline flex-1">
                {recentClients.map((c) => (
                  <li
                    key={c.id}
                    className="group relative flex items-center justify-between px-4 py-3.5 hover:bg-[#7C5CFF]/5"
                  >
                    <Link
                      to="/clients/$id"
                      params={{ id: c.id }}
                      className="absolute inset-0 z-0"
                      aria-label={`Open ${c.company}`}
                    />
                    <div className="relative z-10 flex items-center gap-3">
                      <div
                        className="grid size-8 place-items-center rounded-lg ring-1 ring-hairline"
                        style={{ background: c.brandColors[0] ?? "#e4e4e7" }}
                      >
                        <span
                          className="font-serif text-xs"
                          style={{ color: c.brandColors[2] ?? "#fff" }}
                        >
                          {c.company.slice(0, 1)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{c.company}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.fullName} · {formatRelative(c.updatedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10">
                      {statusChip(c.status)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 border-t border-hairline pt-8 text-sm text-muted-foreground md:flex-row md:items-center">
          <p className="font-serif text-base italic">A quiet workspace for loud ideas.</p>
          <p>© {new Date().getFullYear()} Client Profile Hub</p>
        </div>
      </footer>
    </div>
  );
}
