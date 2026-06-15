import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Download,
  Link2,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
} from "@/components/heroicons";
import {
  formatRelative,
  useClients,
  type ClientStatus,
  type ClientRecord,
  type ClientFile,
} from "@/lib/clients-store";
import { getClientFileHref, fileToBase64 } from "@/lib/client-files";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listClientTasks,
  createClientTask,
  updateClientTask,
  deleteClientTask,
} from "@/lib/tasks.functions";
import {
  deleteClientFile,
  getOrCreatePortalToken,
  regeneratePortalToken,
  uploadClientFile,
  emailPortalLinkToClient,
} from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Client · ${params.id} — Formline` },
      {
        name: "description",
        content: "Full client profile with project requirements, files, notes and activity.",
      },
      { property: "og:title", content: "Client profile — Formline" },
      {
        property: "og:description",
        content: "Full client profile with project requirements, files, notes and activity.",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-serif text-4xl">Client not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been removed.</p>
        <Link
          to="/clients"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background"
        >
          Back to clients
        </Link>
      </div>
    </div>
  ),
  component: ClientProfile,
});

const STATUSES: ClientStatus[] = ["New", "In Progress", "Completed"];
const STATUS_COLORS: Record<ClientStatus, string> = {
  New: "#3b82f6",
  "In Progress": "#f59e0b",
  Completed: "#22c55e",
};
const TABS = ["Overview", "Requirements", "Tasks", "Files", "Activity"] as const;
type Tab = (typeof TABS)[number];

function ClientProfile() {
  const { id } = Route.useParams();
  const { getClient, updateClient, removeClient, isLoading } = useClients();
  const navigate = useNavigate();
  const client = getClient(id);
  const [tab, setTab] = useState<Tab>("Overview");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (client?.notes !== undefined) {
      setNotes(client.notes);
    }
  }, [client?.notes]);

  const clientBrief = useMemo(() => {
    if (!client) return "";
    const tone =
      client.brandColors[0]?.toLowerCase() && parseInt(client.brandColors[0].slice(1, 3), 16) < 80
        ? "restrained, ink-forward palette"
        : "warm, approachable palette";
    const focus = client.services[0] ?? "scope";
    return `${client.company} reads as a ${tone}. The opening priority is ${focus.toLowerCase()} — keep proofs minimal, defer color exploration until after structure is approved.`;
  }, [client]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted-foreground">
          Loading client profile…
        </div>
      </div>
    );
  }

  if (!client) throw notFound();

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await updateClient(client!.id, { notes }, "Notes updated");
      toast.success("Notes saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function changeStatus(s: ClientStatus) {
    try {
      await updateClient(client!.id, { status: s }, `Status changed to ${s}`);
      toast.success(`Status updated to ${s}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  }

  async function deleteClient() {
    if (!confirm(`Remove ${client!.company}? This cannot be undone.`)) return;
    try {
      await removeClient(client!.id);
      toast.success("Client removed");
      navigate({ to: "/clients" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete client");
    }
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> All clients
        </Link>

        {/* Hero */}
        <section className="mt-6 flex flex-col gap-6 border-b border-hairline pb-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div
              className="grid size-14 sm:size-20 place-items-center rounded-2xl ring-1 ring-hairline shrink-0"
              style={{ background: client.brandColors[0] ?? "#e4e4e7" }}
            >
              <span
                className="font-serif text-3xl sm:text-4xl"
                style={{ color: client.brandColors[2] ?? "#fff" }}
              >
                {client.company.slice(0, 1)}
              </span>
            </div>
            <div className="space-y-1 sm:space-y-2 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {client.industry || "Engagement"}
              </span>
              <h1 className="font-serif text-3xl leading-[1.05] sm:text-4xl md:text-5xl truncate">{client.company}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {client.fullName} · {client.email}
                {client.website ? ` · ${client.website}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={statusRef}>
              <button
                type="button"
                onClick={() => setStatusOpen((o) => !o)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-sm font-medium ring-1 ring-hairline hover:bg-secondary transition-all cursor-pointer select-none"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: STATUS_COLORS[client.status] }}
                />
                {client.status}
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    statusOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {statusOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-hairline bg-surface p-1 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-top-1 duration-150">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        changeStatus(s);
                        setStatusOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                        client.status === s
                          ? "bg-white/[0.06] font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ background: STATUS_COLORS[s] }}
                      />
                      <span className="flex-1 text-left">{s}</span>
                      {client.status === s && (
                        <Check className="size-3.5 text-[#7C5CFF]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
        <nav className="my-6 sm:my-8 flex gap-4 sm:gap-6 border-b border-hairline overflow-x-auto pb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "-mb-px border-b-2 pb-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors " +
                (tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
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
                  <p className="max-w-[58ch] text-pretty text-muted-foreground">
                    {client.goals || "No project goals captured yet."}
                  </p>
                </div>

                {/* Client brief */}
                <div className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
                  <div className="flex items-start gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Client brief
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Quick read from intake details — brand, services, and goals.
                      </p>
                      <p className="mt-2 font-serif text-xl leading-snug italic text-foreground">
                        "{clientBrief}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Brand colors */}
                {client.brandColors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Brand palette
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {client.brandColors.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-hairline"
                        >
                          <div
                            className="size-8 rounded-lg ring-1 ring-hairline"
                            style={{ background: c }}
                          />
                          <span className="font-mono text-xs uppercase text-muted-foreground">
                            {c}
                          </span>
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
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="mt-2 text-sm text-pretty">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {tab === "Tasks" && <TasksSection clientId={client.id} />}

            {tab === "Files" && <FilesSection client={client} />}

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
              <PortalCard clientId={client.id} initialToken={client.portalToken} />
              <div className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Client details
                </h3>
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
                    <div
                      key={k}
                      className="flex items-start justify-between gap-4 border-b border-hairline pb-2 last:border-0"
                    >
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="max-w-[60%] text-right font-medium break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h3 className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Timeline
                </h3>
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

function TasksSection({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const listTasks = useServerFn(listClientTasks);
  const createTask = useServerFn(createClientTask);
  const updateTask = useServerFn(updateClientTask);
  const deleteTask = useServerFn(deleteClientTask);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", clientId],
    queryFn: () => listTasks({ data: { clientId } }),
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const addMut = useMutation({
    mutationFn: (args: { title: string; dueDate?: string }) =>
      createTask({ data: { clientId, title: args.title, dueDate: args.dueDate || undefined } }),
    onSuccess: () => {
      setNewTaskTitle("");
      setNewTaskDueDate("");
      queryClient.invalidateQueries({ queryKey: ["tasks", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create task"),
  });

  const toggleMut = useMutation({
    mutationFn: (args: { id: string; completed: boolean }) =>
      updateTask({ data: { id: args.id, completed: args.completed } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error("Failed to update task"),
  });

  const deleteMut = useMutation({
    mutationFn: (args: { id: string }) => deleteTask({ data: { id: args.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error("Failed to delete task"),
  });

  const presets = [
    { title: "Waiting on assets", offsetDays: 3 },
    { title: "Schedule kickoff", offsetDays: 5 },
    { title: "Send proposal", offsetDays: 2 },
    { title: "Follow up", offsetDays: 7 },
  ];

  const handleAddPreset = (title: string, offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    addMut.mutate({ title, dueDate: date.toISOString() });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addMut.mutate({
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
    });
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <div>
          <h2 className="font-serif text-3xl">Onboarding Checklist</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assign and track follow-up onboarding tasks for this client.
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="text-right">
            <span className="text-sm font-semibold">
              {completedCount}/{tasks.length} Done
            </span>
            <div className="w-32 bg-secondary h-1.5 rounded-full mt-1 overflow-hidden ring-1 ring-hairline">
              <div
                className="bg-[#7C5CFF] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Quick Presets
        </h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.title}
              onClick={() => handleAddPreset(p.title, p.offsetDays)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-medium ring-1 ring-hairline hover:bg-secondary cursor-pointer transition-all"
            >
              <Plus className="size-3 text-[#7C5CFF]" />
              {p.title} (+{p.offsetDays}d)
            </button>
          ))}
        </div>
      </div>

      {/* Custom task input */}
      <form
        onSubmit={handleCustomSubmit}
        className="flex flex-wrap gap-3 items-end bg-surface p-4 rounded-xl ring-1 ring-hairline"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            Task Description
          </label>
          <input
            type="text"
            placeholder="e.g. Schedule design walkthrough..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="h-10 w-full rounded-lg border border-hairline bg-background px-3 text-sm focus:border-[#7C5CFF] focus:outline-none"
            required
          />
        </div>
        <div className="w-[180px]">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            Due Date
          </label>
          <input
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            className="h-10 w-full rounded-lg border border-hairline bg-background px-3 text-sm focus:border-[#7C5CFF] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={addMut.isPending}
          className="h-10 inline-flex items-center justify-center rounded-lg bg-[#7C5CFF] text-sm font-medium text-white hover:opacity-90 px-5 disabled:opacity-50 cursor-pointer"
        >
          {addMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add Task"}
        </button>
      </form>

      {/* Task list */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-surface ring-1 ring-hairline text-sm text-muted-foreground">
          No tasks added yet. Use a quick preset above or add a custom task.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((task) => {
            const isOverdue =
              task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
            return (
              <li
                key={task.id}
                className={`flex items-center justify-between rounded-xl bg-surface p-4 ring-1 ring-hairline transition-all ${
                  task.completed ? "opacity-60 bg-white/[0.01]" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => toggleMut.mutate({ id: task.id, completed: e.target.checked })}
                    className="size-4 rounded border-hairline accent-[#7C5CFF] cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span
                        className={`ml-3 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
                          isOverdue
                            ? "bg-red-500/10 text-red-500 font-semibold"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        <Calendar className="size-3" />
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {isOverdue && " (Overdue)"}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm("Delete this task?")) {
                      deleteMut.mutate({ id: task.id });
                    }
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilesSection({ client }: { client: ClientRecord }) {
  const queryClient = useQueryClient();
  const deleteFile = useServerFn(deleteClientFile);
  const uploadFile = useServerFn(uploadClientFile);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFiles(e.target.files);
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    setUploading(true);
    const toastId = toast.loading("Uploading document...");
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileBase64 = await fileToBase64(file);

        await uploadFile({
          data: {
            clientId: client.id,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileBase64,
          },
        });
      }
      toast.success("File uploaded successfully", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "File upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    const toastId = toast.loading("Deleting file...");
    try {
      await deleteFile({ data: { fileId } });
      toast.success("File deleted successfully", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete file", { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <div>
          <h2 className="font-serif text-3xl">Uploaded files</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage files and assets uploaded for this client profile.
          </p>
        </div>
      </div>

      {/* Drag & Drop File Zone */}
      <div
        className={`border border-dashed rounded-xl p-6 text-center transition-all ${
          dragActive
            ? "border-[#7C5CFF] bg-[#7C5CFF]/5"
            : "border-hairline bg-surface/50 hover:border-foreground/20 hover:bg-surface"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="client-file-upload"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={uploading}
        />
        <label
          htmlFor="client-file-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <div className="size-10 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF] flex items-center justify-center mb-3">
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Paperclip className="size-5" />
            )}
          </div>
          <p className="text-sm font-medium">
            Drag & drop files here, or{" "}
            <span className="text-[#7C5CFF] hover:underline">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload client assets, branding guides, design brief...
          </p>
        </label>
      </div>

      {client.files.length === 0 ? (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-hairline">
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {client.files.map((f: ClientFile) => {
            const href = getClientFileHref(f);
            return (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-xl bg-surface p-4 ring-1 ring-hairline"
            >
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-medium text-foreground" title={f.name}>
                  {f.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(f.size / 1024).toFixed(1)} KB &bull; {f.type || "file"}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {href && (
                  <a
                    href={href}
                    download={f.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium bg-[#7C5CFF]/10 text-[#7C5CFF] hover:bg-[#7C5CFF]/20 transition-all cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                )}
                <button
                  onClick={() => handleDeleteFile(f.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PortalCard({ clientId, initialToken }: { clientId: string; initialToken?: string }) {
  const queryClient = useQueryClient();
  const getOrCreateToken = useServerFn(getOrCreatePortalToken);
  const regenerateToken = useServerFn(regeneratePortalToken);
  const sendEmail = useServerFn(emailPortalLinkToClient);

  const [copied, setCopied] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");

  const { data: tokenData } = useQuery({
    queryKey: ["portal-token", clientId],
    queryFn: () => getOrCreateToken({ data: { clientId } }),
    initialData: initialToken ? { token: initialToken } : undefined,
  });

  const token = tokenData?.token;
  const portalUrl = token ? `${window.location.origin}/portal/${token}` : "";

  const handleCopy = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Client portal link copied to clipboard");
  };

  const handleRegenerate = async () => {
    if (!confirm("Regenerate portal link? The existing link will immediately stop working."))
      return;
    const toastId = toast.loading("Regenerating link...");
    try {
      await regenerateToken({ data: { clientId } });
      queryClient.invalidateQueries({ queryKey: ["portal-token", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Link regenerated successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate link", { id: toastId });
    }
  };

  const emailMut = useMutation({
    mutationFn: () => sendEmail({ data: { clientId, message: personalMessage || undefined } }),
    onSuccess: () => {
      toast.success("Portal link emailed to client successfully");
      setShowEmailPanel(false);
      setPersonalMessage("");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    },
  });

  return (
    <div className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1.5">
        <Link2 className="size-3.5 text-[#7C5CFF]" />
        Client Portal
      </h3>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        Share this private link with your client. They can update their details and upload assets
        without needing an account.
      </p>

      {portalUrl ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-background/50 border border-hairline px-3 py-2 text-xs">
            <span className="truncate text-muted-foreground select-all flex-1">{portalUrl}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-grow inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#7C5CFF] text-xs font-medium text-white hover:opacity-90 cursor-pointer transition-all"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => setShowEmailPanel(!showEmailPanel)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-medium ring-1 ring-hairline hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground transition-all"
            >
              <Mail className="size-3.5 text-[#7C5CFF]" /> Email
            </button>
            <button
              onClick={handleRegenerate}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-medium ring-1 ring-hairline hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground transition-all"
            >
              Regenerate
            </button>
          </div>

          {showEmailPanel && (
            <div className="mt-4 p-3 bg-background/30 rounded-xl border border-hairline space-y-3">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Optional Personal Note
              </label>
              <textarea
                placeholder="Include a message (e.g. Please upload your brand assets...)"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                className="w-full h-16 text-xs bg-background border border-hairline rounded-lg p-2 resize-none focus:outline-none focus:border-[#7C5CFF]"
              />
              <button
                onClick={() => emailMut.mutate()}
                disabled={emailMut.isPending}
                className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-xs font-medium text-background hover:opacity-90 cursor-pointer transition-all disabled:opacity-50"
              >
                {emailMut.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Send Email to Client"
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 text-center text-xs text-muted-foreground py-2">
          Generating portal link...
        </div>
      )}
    </div>
  );
}
