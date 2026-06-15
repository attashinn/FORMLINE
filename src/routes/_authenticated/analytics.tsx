import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useClients, type ClientStatus } from "@/lib/clients-store";
import { listForms, listAllSubmissions } from "@/lib/forms.functions";
import {
  buildMonthlyAreaChart,
  countItemsByMonth,
  getLastMonthBuckets,
} from "@/lib/workspace-metrics";
import {
  BarChart3,
  Users,
  FileText,
  Sparkles,
  ArrowUpRight,
  ClipboardList,
} from "@/components/heroicons";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Formline" },
      {
        name: "description",
        content: "Insights into your forms, submissions, and client pipeline.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { clients, isLoading: clientsLoading } = useClients();
  const listFormsServer = useServerFn(listForms);
  const listSubs = useServerFn(listAllSubmissions);

  const { data: forms = [], isLoading: formsLoading } = useQuery({
    queryKey: ["forms"],
    queryFn: () => listFormsServer(),
    retry: 1,
    staleTime: 0,
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["all-submissions"],
    queryFn: () => listSubs(),
    retry: 1,
    staleTime: 0,
  });

  const isLoading = clientsLoading || formsLoading || subsLoading;

  // --- Derived stats ---
  const totalForms = forms.length;
  const publishedForms = forms.filter((f) => f.is_published).length;
  const totalSubmissions = submissions.length;
  const newSubmissions = submissions.filter((s) => s.status === "New").length;
  const convertedSubmissions = submissions.filter((s) => s.status === "Converted").length;
  const conversionRate = totalSubmissions > 0
    ? Math.round((convertedSubmissions / totalSubmissions) * 100)
    : 0;

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status !== "Completed").length;

  const monthBuckets = useMemo(() => getLastMonthBuckets(6), []);

  const subsByMonth = useMemo(
    () =>
      countItemsByMonth(submissions, monthBuckets, (s) => new Date(s.submitted_at)),
    [submissions, monthBuckets],
  );

  const clientsByMonth = useMemo(
    () =>
      countItemsByMonth(clients, monthBuckets, (c) => new Date(c.createdAt)),
    [clients, monthBuckets],
  );

  const submissionsChart = useMemo(
    () => buildMonthlyAreaChart(subsByMonth, { xStart: 50, xStep: 90, yTop: 20, yBottom: 180 }),
    [subsByMonth],
  );

  const subPoints = submissionsChart.points;
  const subStrokePath = submissionsChart.strokePath;
  const subFillPath = submissionsChart.fillPath;

  // --- Client status breakdown ---
  const statusStats = useMemo(() => {
    const map: Record<ClientStatus, number> = { New: 0, "In Progress": 0, Completed: 0 };
    clients.forEach((c) => map[c.status]++);
    return [
      { label: "New", count: map["New"], color: "bg-amber-500", pct: totalClients ? Math.round((map["New"] / totalClients) * 100) : 0 },
      { label: "In Progress", count: map["In Progress"], color: "bg-[#7C5CFF]", pct: totalClients ? Math.round((map["In Progress"] / totalClients) * 100) : 0 },
      { label: "Completed", count: map["Completed"], color: "bg-emerald-500", pct: totalClients ? Math.round((map["Completed"] / totalClients) * 100) : 0 },
    ];
  }, [clients, totalClients]);

  // --- Industry breakdown (top 5) ---
  const industryStats = useMemo(() => {
    const map: Record<string, number> = {};
    clients.forEach((c) => {
      if (c.industry) map[c.industry] = (map[c.industry] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count, pct: totalClients ? Math.round((count / totalClients) * 100) : 0 }));
  }, [clients, totalClients]);

  // --- Top forms by submissions ---
  const topForms = useMemo(() => {
    const map: Record<string, { title: string; count: number }> = {};
    submissions.forEach((s) => {
      if (!map[s.form_id]) map[s.form_id] = { title: s.form_title || "Untitled", count: 0 };
      map[s.form_id].count++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([formId, v]) => ({ formId, ...v }));
  }, [submissions]);

  const maxTopForm = Math.max(...topForms.map((f) => f.count), 1);

  const statCards = [
    { label: "Total Forms", value: isLoading ? "—" : totalForms, sub: `${publishedForms} published`, icon: FileText, color: "text-[#7C5CFF]" },
    { label: "Total Responses", value: isLoading ? "—" : totalSubmissions, sub: `${newSubmissions} unreviewed`, icon: ClipboardList, color: "text-amber-400" },
    { label: "Total Clients", value: isLoading ? "—" : totalClients, sub: `${activeClients} active`, icon: Users, color: "text-emerald-400" },
    { label: "Conversion Rate", value: isLoading ? "—" : `${conversionRate}%`, sub: `${convertedSubmissions} converted`, icon: BarChart3, color: "text-sky-400" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[480px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.22),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">

        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
            Workspace insights
          </span>
          <h1 className="mt-3 font-serif text-3xl leading-[1.05] sm:text-4xl md:text-5xl lg:text-6xl">
            Analytics <span className="italic text-muted-foreground">overview</span>
          </h1>
          <p className="mt-3 max-w-[56ch] text-pretty text-muted-foreground">
            Track form performance, submission trends, and client pipeline health across your entire workspace.
          </p>
        </motion.section>

        {/* Stat Cards */}
        <section className="mb-8 sm:mb-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 + i * 0.07 }}
                className="rounded-2xl bg-surface p-5 ring-1 ring-hairline flex flex-col gap-3"
              >
                <div className={`w-fit rounded-xl p-2 bg-surface-muted ${card.color}`}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="font-serif text-4xl leading-none">{card.value}</div>
                  <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {card.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground/70">{card.sub}</div>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Charts Row */}
        <section className="mb-8 sm:mb-10 grid gap-4 sm:gap-6 md:grid-cols-3">

          {/* Submissions over time */}
          <div className="md:col-span-2 rounded-3xl bg-surface p-6 ring-1 ring-hairline flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#7C5CFF]" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Responses — Last 6 Months</h2>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Total form submissions received per month.</p>
              </div>
              <Link to="/responses" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Inbox <ArrowUpRight className="size-3" />
              </Link>
            </div>
            <div className="relative flex-1 min-h-[200px]">
              {subsLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
              ) : !submissionsChart.hasData ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No submissions in the last 6 months.
                </div>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 540 220" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="subAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="subLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9D7FFF" />
                      <stop offset="100%" stopColor="#6C4AFF" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {[0.25, 0.5, 0.75, 1].map((f) => (
                    <line key={f} x1="30" y1={20 + f * 160} x2="510" y2={20 + f * 160}
                      stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
                  ))}
                  {subFillPath && <path d={subFillPath} fill="url(#subAreaGrad)" />}
                  {subStrokePath && (
                    <path d={subStrokePath} fill="none" stroke="url(#subLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {subPoints.map((pt) => (
                    <g key={pt.label}>
                      <circle cx={pt.x} cy={pt.y} r="6" fill="#7C5CFF" fillOpacity="0.2" />
                      <circle cx={pt.x} cy={pt.y} r="3.5" fill="#fff" stroke="#7C5CFF" strokeWidth="2" />
                      <text x={pt.x} y="210" fill="var(--color-muted-foreground)" fontSize="10" textAnchor="middle">{pt.label}</text>
                      {pt.count > 0 && (
                        <text x={pt.x} y={pt.y - 10} fill="var(--color-foreground)" fontSize="10" fontWeight="bold" textAnchor="middle">{pt.count}</text>
                      )}
                    </g>
                  ))}
                </svg>
              )}
            </div>
            {!subsLoading && submissionsChart.hasData && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {clientsByMonth.reduce((n, m) => n + m.count, 0)} new clients in the same period
              </p>
            )}
          </div>

          {/* Client Status Breakdown */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Users className="size-4 text-[#7C5CFF]" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Client Status</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Pipeline stage breakdown.</p>

            {clientsLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : totalClients === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">No clients yet.</div>
            ) : (
              <div className="flex flex-col gap-5 my-auto">
                {statusStats.map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground">{s.count} · {s.pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-muted ring-1 ring-hairline overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                        className={`h-full rounded-full ${s.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-hairline mt-4 pt-4">
              <Link to="/clients" className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors">
                <span>View all clients</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom Row */}
        <section className="grid gap-4 sm:gap-6 md:grid-cols-2">

          {/* Top Forms by Responses */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[#7C5CFF]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Top Forms</h2>
              </div>
              <Link to="/forms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                All forms
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Ranked by number of responses received.</p>

            {subsLoading || formsLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : topForms.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</div>
            ) : (
              <div className="space-y-4">
                {topForms.map((f, i) => (
                  <div key={f.formId}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium truncate max-w-[200px]">{f.title}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{f.count} {f.count === 1 ? "response" : "responses"}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-muted ring-1 ring-hairline overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((f.count / maxTopForm) * 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + i * 0.07 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#A28CFF]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Industry Breakdown */}
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-hairline">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="size-4 text-[#7C5CFF]" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">Client Industries</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">Distribution of your top 5 client industries.</p>

            {clientsLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : industryStats.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No industry data yet.</div>
            ) : (
              <div className="space-y-4">
                {industryStats.map((ind, i) => (
                  <div key={ind.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium truncate max-w-[200px]">{ind.label}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{ind.count} · {ind.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-muted ring-1 ring-hairline overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ind.pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + i * 0.07 }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
