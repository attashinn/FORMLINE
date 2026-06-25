import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listAllSubmissions, updateSubmissionStatus, deleteSubmission, convertSubmissionToClient } from "@/lib/forms.functions";
import type { SubmissionStatus } from "@/lib/forms.types";
import {
  Search,
  X,
  Trash2,
  ArrowUpRight,
  Loader2,
  ClipboardList,
  Users,
} from "@/components/heroicons";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/_authenticated/responses")({
  head: () => ({
    meta: [
      { title: "Responses Inbox — Formline" },
      {
        name: "description",
        content: "All form submissions across every form, in one unified inbox.",
      },
    ],
  }),
  component: ResponsesPage,
});

const STATUS_OPTIONS: SubmissionStatus[] = ["New", "Reviewed", "Converted", "Archived"];

const STATUS_CHIP: Record<SubmissionStatus, string> = {
  New: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Reviewed: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  Converted: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Archived: "bg-white/5 text-muted-foreground ring-white/10",
};

type EnrichedSubmission = {
  id: string;
  form_id: string;
  form_title: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitted_at: string;
  status: SubmissionStatus;
  converted_client_id: string | null;
  data: Record<string, unknown>;
};

function ResponsesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listSubs = useServerFn(listAllSubmissions);
  const updateStatus = useServerFn(updateSubmissionStatus);
  const deleteSub = useServerFn(deleteSubmission);
  const convertSub = useServerFn(convertSubmissionToClient);

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | SubmissionStatus>("all");
  const [selected, setSelected] = useState<EnrichedSubmission | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["all-submissions"],
    queryFn: () => listSubs(),
    retry: 1,
    staleTime: 0,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubmissionStatus }) =>
      updateStatus({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["all-submissions"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSub({ data: { id } }),
    onSuccess: () => {
      toast.success("Response deleted");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["all-submissions"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => convertSub({ data: { id } }),
    onSuccess: (res) => {
      toast.success("Converted to client!");
      qc.invalidateQueries({ queryKey: ["all-submissions"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setSelected(null);
      navigate({ to: "/clients/$id", params: { id: res.clientId } });
    },
    onError: () => toast.error("Conversion failed"),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (submissions as EnrichedSubmission[]).filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (!q) return true;
      return (
        (s.submitter_name?.toLowerCase().includes(q) ?? false) ||
        (s.submitter_email?.toLowerCase().includes(q) ?? false) ||
        s.form_title.toLowerCase().includes(q)
      );
    });
  }, [submissions, query, filterStatus]);

  const unreviewed = (submissions as EnrichedSubmission[]).filter((s) => s.status === "New").length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[480px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.22),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">

        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
              Unified inbox
            </span>
            <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
              Responses <span className="italic text-muted-foreground">inbox</span>
            </h1>
            <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
              Every form submission, across all your forms, in one place.
              {unreviewed > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/20">
                  {unreviewed} new
                </span>
              )}
            </p>
          </div>
        </motion.section>

        {/* Filters */}
        <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or form…"
              className="h-10 w-full rounded-lg bg-surface pl-9 pr-4 text-sm ring-1 ring-hairline outline-none transition-shadow focus:ring-2 focus:ring-foreground/80"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", ...STATUS_OPTIONS] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ring-1 ${
                  filterStatus === s
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-surface text-muted-foreground ring-hairline hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </section>

        {/* List */}
        {isLoading ? (
          <div className="rounded-2xl bg-surface py-20 flex flex-col items-center gap-3 ring-1 ring-hairline">
            <Loader2 className="size-6 animate-spin text-[#7C5CFF]" />
            <p className="text-sm text-muted-foreground">Loading responses…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-surface py-20 text-center ring-1 ring-hairline">
            <ClipboardList className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-serif text-2xl">No responses found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query || filterStatus !== "all" ? "Try clearing your filters." : "Share a form link to start collecting responses."}
            </p>
            {!query && filterStatus === "all" && (
              <Link to="/forms" className="mt-6 inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background">
                Go to Forms
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline">
            {filtered.map((sub, i) => (
              <motion.li
                key={sub.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.025 }}
                onClick={() => setSelected(sub)}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#7C5CFF]/5 cursor-pointer"
              >
                {/* Avatar */}
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#7C5CFF]/20 to-[#7C5CFF]/5 text-[#7C5CFF] font-semibold text-sm ring-1 ring-[#7C5CFF]/20">
                  {(sub.submitter_name || sub.submitter_email || "?").slice(0, 1).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {sub.submitter_name || sub.submitter_email || "Anonymous"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${STATUS_CHIP[sub.status]}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="text-foreground/70 font-medium">{sub.form_title}</span>
                    {sub.submitter_email && <><span>·</span><span>{sub.submitter_email}</span></>}
                    <span>·</span>
                    <span>{new Date(sub.submitted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                {/* Action */}
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </motion.li>
            ))}
          </ul>
        )}
      </main>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-hairline flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-hairline">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C5CFF]">Response Detail</div>
                  <div className="mt-0.5 font-serif text-xl text-foreground truncate">
                    {selected.submitter_name || selected.submitter_email || "Anonymous"}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-hairline"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Meta */}
                <div className="rounded-xl bg-surface-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Form</span>
                    <span className="font-medium text-foreground text-right max-w-[55%] truncate">{selected.form_title}</span>
                  </div>
                  {selected.submitter_email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground">{selected.submitter_email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium text-foreground">
                      {new Date(selected.submitted_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Select
                      value={selected.status}
                      onValueChange={(val: SubmissionStatus) => {
                        updateMut.mutate({ id: selected.id, status: val });
                        setSelected({ ...selected, status: val });
                      }}
                    >
                      <SelectTrigger className="h-8 w-28 rounded-lg border-0 bg-surface px-2 text-left text-xs shadow-none ring-1 ring-hairline transition-all hover:bg-surface-muted hover:ring-foreground/20 focus:ring-2 focus:ring-foreground/20 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={6}
                        className="z-[60] min-w-[120px] rounded-xl border-0 p-1 bg-popover shadow-2xl ring-1 ring-hairline"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="cursor-pointer rounded-lg py-1.5 pl-2 pr-8 focus:bg-secondary text-xs text-foreground"
                          >
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Response Data */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">Response Fields</div>
                  <div className="space-y-3">
                    {Object.entries(selected.data || {}).map(([key, val]) => (
                      <div key={key} className="rounded-xl bg-surface-muted p-3">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mb-1">{key}</div>
                        <div className="text-sm text-foreground break-words">
                          {Array.isArray(val) ? val.join(", ") : String(val ?? "—")}
                        </div>
                      </div>
                    ))}
                    {Object.keys(selected.data || {}).length === 0 && (
                      <p className="text-sm text-muted-foreground">No field data available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-hairline p-4 space-y-2">
                {selected.status !== "Converted" && !selected.converted_client_id && (
                  <button
                    onClick={() => convertMut.mutate(selected.id)}
                    disabled={convertMut.isPending}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {convertMut.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Users className="size-4" />
                    )}
                    Convert to Client
                  </button>
                )}
                {selected.converted_client_id && (
                  <Link
                    to="/clients/$id"
                    params={{ id: selected.converted_client_id }}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-300 text-sm font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <ArrowUpRight className="size-4" /> View Client Profile
                  </Link>
                )}
                <button
                  onClick={() => {
                    if (confirm("Delete this response permanently?")) deleteMut.mutate(selected.id);
                  }}
                  disabled={deleteMut.isPending}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  Delete response
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
