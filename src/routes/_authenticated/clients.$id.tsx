import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, Sparkles, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { formatRelative, useClients, type ClientStatus } from "@/lib/clients-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Client · ${params.id} — Client Profile Hub` },
      { name: "description", content: "Full client profile with project requirements, files, notes and activity." },
      { property: "og:title", content: "Client profile — Client Profile Hub" },
      { property: "og:description", content: "Full client profile with project requirements, files, notes and activity." },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-serif text-4xl">Client not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been removed.</p>
        <Link to="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background">
          Back to dashboard
        </Link>
      </div>
    </div>
  ),
  component: ClientProfile,
});

const STATUSES: ClientStatus[] = ["New", "In Progress", "Completed"];
const TABS = ["Overview", "Requirements", "Files", "Activity"] as const;
type Tab = (typeof TABS)[number];

function ClientProfile() {
  const { id } = Route.useParams();
  const { getClient, updateClient, removeClient } = useClients();
  const navigate = useNavigate();
  const client = getClient(id);
  const [tab, setTab] = useState<Tab>("Overview");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  if (!client) throw notFound();

  const insight = useMemo(() => {
    const tone =
      client.brandColors[0]?.toLowerCase() && parseInt(client.brandColors[0].slice(1, 3), 16) < 80
        ? "restrained, ink-forward palette"
        : "warm, approachable palette";
    const focus = client.services[0] ?? "scope";
    return `${client.company} reads as a ${tone}. The opening priority is ${focus.toLowerCase()} — keep proofs minimal, defer color exploration until after structure is approved.`;
  }, [client]);

  function saveNotes() {
    setSavingNotes(true);
    updateClient(client!.id, { notes }, "Notes updated");
    setTimeout(() => {
      setSavingNotes(false);
      toast.success("Notes saved");
    }, 300);
  }

  function changeStatus(s: ClientStatus) {
    updateClient(client!.id, { status: s }, `Status changed to ${s}`);
    toast.success(`Status updated to ${s}`);
  }

  function deleteClient() {
    if (!confirm(`Remove ${client!.company}? This cannot be undone.`)) return;
    removeClient(client!.id);
    toast.success("Client removed");
    navigate({ to: "/" });
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(client, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client!.company.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" /> All clients
        </Link>

        {/* Hero */}
        <section className="mt-6 flex flex-col gap-6 border-b border-hairline pb-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="grid size-20 place-items-center rounded-2xl ring-1 ring-hairline"
              style={{ background: client.brandColors[0] ?? "#e4e4e7" }}
            >
              <span className="font-serif text-4xl" style={{ color: client.brandColors[2] ?? "#fff" }}>
                {client.company.slice(0, 1)}
              </span>
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {client.industry || "Engagement"}
              </span>
              <h1 className="font-serif text-5xl leading-[1.05]">{client.company}</h1>
              <p className="text-sm text-muted-foreground">
                {client.fullName} · {client.email}
                {client.website ? ` · ${client.website}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={client.status}
              onChange={(e) => changeStatus(e.target.value as ClientStatus)}
              className="h-9 rounded-lg bg-surface px-3 text-sm ring-1 ring-hairline outline-none focus:ring-2 focus:ring-foreground/80"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={downloadJson}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-sm font-medium ring-1 ring-hairline hover:bg-secondary"
            >
              <Download className="size-4" /> Export
            </button>
            <button
              onClick={deleteClient}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-sm font-medium text-muted-foreground ring-1 ring-hairline hover:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </section>

        {/* Tabs */}
        <nav className="my-8 flex gap-6 border-b border-hairline">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "-mb-px border-b-2 pb-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors " +
                (tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <section className="space-y-10 lg:col-span-8">
            {tab === "Overview" && (
              <>
                <div className="space-y-4">
                  <h2 className="font-serif text-3xl leading-tight">Project scope</h2>
                  <p className="max-w-[58ch] text-pretty text-muted-foreground">{client.goals || "No project goals captured yet."}</p>
                </div>

                {/* AI Insight */}
                <div className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
                  <div className="flex items-start gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        AI client insight
                      </h3>
                      <p className="mt-2 font-serif text-xl leading-snug italic text-foreground">"{insight}"</p>
                    </div>
                  </div>
                </div>

                {/* Brand colors */}
                {client.brandColors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Brand palette</h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {client.brandColors.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-hairline">
                          <div className="size-8 rounded-lg ring-1 ring-hairline" style={{ background: c }} />
                          <span className="font-mono text-xs uppercase text-muted-foreground">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Internal notes</h3>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes || notes === client.notes}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      {savingNotes ? "Saving…" : notes === client.notes ? "Saved" : "Save notes"}
                    </button>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Capture context, decisions, blockers…"
                    className="min-h-[140px] w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </>
            )}

            {tab === "Requirements" && (
              <div className="space-y-6">
                <h2 className="font-serif text-3xl">Project requirements</h2>
                <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ["Goals", client.goals || "—"],
                    ["Budget", client.budget || "—"],
                    ["Deadline", client.deadline || "—"],
                    ["Services", client.services.join(", ") || "—"],
                    ["Industry", client.industry || "—"],
                    ["Company size", client.companySize || "—"],
                    ["Website", client.website || "—"],
                    ["Style references", client.styleReferences || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-surface p-5 ring-1 ring-hairline">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{k}</dt>
                      <dd className="mt-2 text-sm text-pretty">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {tab === "Files" && (
              <div className="space-y-4">
                <h2 className="font-serif text-3xl">Uploaded files</h2>
                {client.files.length === 0 ? (
                  <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-hairline">
                    <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {client.files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between rounded-xl bg-surface p-4 ring-1 ring-hairline">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {f.type || "file"}</div>
                        </div>
                        {f.dataUrl && (
                          <a
                            href={f.dataUrl}
                            download={f.name}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            Download
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "Activity" && (
              <div className="space-y-4">
                <h2 className="font-serif text-3xl">Activity</h2>
                <ol className="relative space-y-6 border-l border-hairline pl-6">
                  {client.activity.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[27px] top-1.5 size-2.5 rounded-full bg-foreground ring-4 ring-background" />
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(a.timestamp)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* Side panel */}
          <aside className="lg:col-span-4">
            <div className="sticky top-20 space-y-8">
              <div className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Client details</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Contact", client.fullName],
                    ["Email", client.email],
                    ["Phone", client.phone || "—"],
                    ["Company", client.company],
                    ["Industry", client.industry || "—"],
                    ["Location", client.location || "—"],
                    ["Budget", client.budget || "—"],
                    ["Deadline", client.deadline || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 border-b border-hairline pb-2 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="max-w-[60%] text-right font-medium break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h3 className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Timeline</h3>
                <ol className="mt-4 space-y-5 border-l border-hairline pl-5">
                  {client.activity.slice(0, 4).map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[22px] top-1 size-2 rounded-full bg-foreground" />
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(a.timestamp)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
