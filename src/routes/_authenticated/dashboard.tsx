import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { exportClientsCsv, formatRelative, useClients, type ClientStatus } from "@/lib/clients-store";
import { ArrowUpRight, Download, LayoutGrid, Rows3, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Client Profile Hub" },
      { name: "description", content: "All active client partnerships, intake status, and pipeline at a glance." },
      { property: "og:title", content: "Dashboard — Client Profile Hub" },
      { property: "og:description", content: "All active client partnerships, intake status, and pipeline at a glance." },
    ],
  }),
  component: Dashboard,
});

const STATUS: ClientStatus[] = ["New", "In Progress", "Completed"];

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
  const { clients } = useClients();
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [view, setView] = useState<"table" | "cards">("table");

  const industries = useMemo(
    () => Array.from(new Set(clients.map((c) => c.industry).filter(Boolean))).sort(),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (industry !== "all" && c.industry !== industry) return false;
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q)
      );
    });
  }, [clients, query, industry, status]);

  const stats = useMemo(() => {
    const open = clients.filter((c) => c.status !== "Completed").length;
    const newCount = clients.filter((c) => c.status === "New").length;
    return { total: clients.length, open, newCount };
  }, [clients]);

  function downloadCsv() {
    const blob = new Blob([exportClientsCsv(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[520px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.28),transparent_60%)] before:content-['']">
      <SiteHeader />
      <main className="relative mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-16">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
              The workspace
            </span>
            <h1 className="font-serif text-5xl leading-[1.05] text-balance md:text-6xl">
              Active <span className="italic text-muted-foreground">partnerships</span>
            </h1>
            <p className="max-w-[58ch] text-pretty text-muted-foreground">
              Oversee client onboarding, project requirements, and communication cycles from a single, quiet interface
              made for studios that care about the details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCsv}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-sm font-medium text-foreground ring-1 ring-hairline transition-colors hover:bg-secondary"
            >
              <Download className="size-4" />
              Export CSV
            </button>
            <Link
              to="/intake"
              className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background ring-1 ring-foreground transition-colors hover:bg-foreground/90"
            >
              New Client
            </Link>
          </div>
        </motion.section>

        {/* Stats strip */}
        <section className="mb-10 grid grid-cols-3 divide-x divide-hairline rounded-2xl bg-surface ring-1 ring-hairline">
          {[
            { label: "Total clients", value: stats.total },
            { label: "Open engagements", value: stats.open },
            { label: "New this period", value: stats.newCount },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="px-6 py-5"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-2 font-serif text-4xl leading-none">{s.value}</div>
            </motion.div>
          ))}
        </section>

        {/* Filters */}
        <section className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <div className="relative md:max-w-sm md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients, companies, emails…"
                className="h-10 w-full rounded-lg bg-surface pl-9 pr-4 text-sm ring-1 ring-hairline outline-none transition-shadow focus:ring-2 focus:ring-foreground/80"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-10 rounded-lg bg-surface px-3 text-sm ring-1 ring-hairline outline-none focus:ring-2 focus:ring-foreground/80"
              >
                <option value="all">All industries</option>
                {industries.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-lg bg-surface px-3 text-sm ring-1 ring-hairline outline-none focus:ring-2 focus:ring-foreground/80"
              >
                <option value="all">All statuses</option>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="inline-flex rounded-lg bg-surface p-1 ring-1 ring-hairline">
            <button
              onClick={() => setView("table")}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors " +
                (view === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Rows3 className="size-3.5" /> Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors " +
                (view === "cards" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
              }
            >
              <LayoutGrid className="size-3.5" /> Cards
            </button>
          </div>
        </section>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-surface px-6 py-16 text-center ring-1 ring-hairline">
            <p className="font-serif text-2xl">No matching clients</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different filter, or start a new intake.</p>
            <Link
              to="/intake"
              className="mt-6 inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background"
            >
              Start intake
            </Link>
          </div>
        ) : view === "table" ? (
          <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline bg-surface-muted text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Partner</th>
                  <th className="px-6 py-3 font-medium">Industry</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Budget</th>
                  <th className="px-6 py-3 font-medium">Updated</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-secondary/60">
                    <td className="px-6 py-4">
                      <Link to="/clients/$id" params={{ id: c.id }} className="flex items-center gap-3">
                        <div
                          className="grid size-9 place-items-center rounded-full ring-1 ring-hairline"
                          style={{ background: c.brandColors[0] ?? "#e4e4e7" }}
                        >
                          <span
                            className="font-serif text-sm"
                            style={{ color: c.brandColors[2] ?? "#fff" }}
                          >
                            {c.company.slice(0, 1)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{c.company}</div>
                          <div className="text-xs text-muted-foreground">{c.fullName}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{c.industry}</td>
                    <td className="px-6 py-4">{statusChip(c.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.budget || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatRelative(c.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/clients/$id"
                        params={{ id: c.id }}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground"
                      >
                        Open <ArrowUpRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/clients/$id"
                params={{ id: c.id }}
                className="group flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-hairline transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="grid size-12 place-items-center rounded-xl ring-1 ring-hairline"
                    style={{ background: c.brandColors[0] ?? "#e4e4e7" }}
                  >
                    <span className="font-serif text-xl" style={{ color: c.brandColors[2] ?? "#fff" }}>
                      {c.company.slice(0, 1)}
                    </span>
                  </div>
                  {statusChip(c.status)}
                </div>
                <div>
                  <div className="font-serif text-2xl leading-tight">{c.company}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.industry} · {c.location}</div>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.goals}</p>
                <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3 text-xs text-muted-foreground">
                  <span>{c.budget || "—"}</span>
                  <span>Updated {formatRelative(c.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 border-t border-hairline pt-8 text-sm text-muted-foreground md:flex-row md:items-center">
          <p className="font-serif text-base italic">A quiet workspace for loud ideas.</p>
          <p>© {new Date().getFullYear()} Client Profile Hub</p>
        </div>
      </footer>
    </div>
  );
}
