import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteSubmission, getForm, sendFormLinkEmail, updateForm } from "@/lib/forms.functions";
import type { FieldType, FormField } from "@/lib/forms.types";
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  Copy,
  GripVertical,
  Hash,
  ListChecks,
  Mail,
  Phone,
  Plus,
  Save,
  TextCursorInput,
  ToggleLeft,
  Trash2,
} from "@/components/heroicons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/forms/$id")({
  head: ({ params }) => ({ meta: [{ title: `Edit form · ${params.id} — Formline` }] }),
  component: FormDetail,
});

const FIELD_TYPES: FieldType[] = [
  "text",
  "email",
  "textarea",
  "select",
  "checkbox",
  "date",
  "number",
  "tel",
];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  email: "Email",
  textarea: "Long answer",
  select: "Multiple choice",
  checkbox: "Checkbox",
  date: "Date",
  number: "Number",
  tel: "Phone",
};

const FIELD_TYPE_META = {
  text: { icon: TextCursorInput, description: "Single-line answer" },
  email: { icon: Mail, description: "Validated email input" },
  textarea: { icon: AlignLeft, description: "Long-form response" },
  select: { icon: ListChecks, description: "Choose from options" },
  checkbox: { icon: ToggleLeft, description: "Yes or no consent" },
  date: { icon: Calendar, description: "Calendar date" },
  number: { icon: Hash, description: "Numeric answer" },
  tel: { icon: Phone, description: "Phone number" },
} satisfies Record<FieldType, { icon: typeof TextCursorInput; description: string }>;

function rid() {
  return "f_" + Math.random().toString(36).slice(2, 9);
}

function FormDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(getForm);
  const upd = useServerFn(updateForm);
  const delSub = useServerFn(deleteSubmission);
  const sendEmail = useServerFn(sendFormLinkEmail);

  const { data, isLoading } = useQuery({
    queryKey: ["form", id],
    queryFn: () => get({ data: { id } }),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [published, setPublished] = useState(true);
  const [tab, setTab] = useState<"builder" | "responses">("builder");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    if (data?.form) {
      setTitle(data.form.title);
      setDescription(data.form.description ?? "");
      setFields(data.form.fields);
      setPublished(data.form.is_published);
    }
  }, [data?.form]);

  const saveMut = useMutation({
    mutationFn: async () =>
      upd({
        data: { id, title, description: description || undefined, fields, is_published: published },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["form", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const delSubMut = useMutation({
    mutationFn: async (sid: string) => delSub({ data: { id: sid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["form", id] }),
  });

  const emailMut = useMutation({
    mutationFn: async () =>
      sendEmail({
        data: {
          formId: id,
          to: recipientEmail.trim(),
          message: emailMessage.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Email sent");
      setEmailOpen(false);
      setRecipientEmail("");
      setEmailMessage("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send email"),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-6 py-12 text-muted-foreground">Loading…</main>
      </div>
    );
  }

  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "");
  const shareOrigin =
    configuredOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = shareOrigin ? `${shareOrigin}/f/${data.form.share_token}` : "";

  function update(idx: number, patch: Partial<FormField>) {
    setFields((fs) => fs.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function move(idx: number, dir: -1 | 1) {
    setFields((fs) => {
      const next = [...fs];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return fs;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function handleDragStart(e: DragEvent<HTMLButtonElement>, fieldId: string) {
    setDraggingId(fieldId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", fieldId);
  }

  function moveByDrag(targetIdx: number, fieldId = draggingId) {
    if (!fieldId) return;
    setFields((fs) => {
      const from = fs.findIndex((field) => field.id === fieldId);
      if (from === -1 || from === targetIdx) return fs;
      const next = [...fs];
      const [item] = next.splice(from, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, targetIdx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const fieldId = e.dataTransfer.getData("text/plain") || draggingId;
    moveByDrag(targetIdx, fieldId);
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    toast.success("Link copied");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/forms"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All forms
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent font-serif text-4xl outline-none focus:ring-0"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Published
            </label>
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
            >
              <Save className="size-4" /> Save
            </button>
          </div>
        </div>

        {/* Share strip */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-hairline md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Share link
            </div>
            <div className="mt-1 truncate font-mono text-sm">{shareUrl}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyShareUrl}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-sm ring-1 ring-hairline hover:bg-secondary"
            >
              <Copy className="size-4" /> Copy
            </button>
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              disabled={!published || !shareUrl}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              <Mail className="size-4" /> Email to client
            </button>
          </div>
        </div>

        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email form to client</DialogTitle>
              <DialogDescription>
                Sends a branded email with your share link via Resend.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="client-email">Client email</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="client@company.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-message">Personal note (optional)</Label>
                <Textarea
                  id="email-message"
                  placeholder="Add a short note for your client…"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm ring-1 ring-hairline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => emailMut.mutate()}
                disabled={!recipientEmail.trim() || emailMut.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
              >
                <Mail className="size-4" />
                {emailMut.isPending ? "Sending…" : "Send email"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <div className="mt-8 inline-flex rounded-lg bg-surface p-1 ring-1 ring-hairline">
          {(["builder", "responses"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "h-8 rounded-md px-3 text-sm font-medium capitalize " +
                (tab === t ? "bg-foreground text-background" : "text-muted-foreground")
              }
            >
              {t}
              {t === "responses" && ` (${data.submissions.length})`}
            </button>
          ))}
        </div>

        {tab === "builder" ? (
          <div className="mt-6 space-y-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for your client…"
              className="w-full rounded-xl bg-surface p-4 text-sm ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-foreground/80"
              rows={2}
            />

            {fields.map((f, i) => (
              <motion.div
                key={f.id}
                layout
                onDragStart={() => setDraggingId(f.id)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={() => setDraggingId(null)}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={
                  "group rounded-2xl bg-surface p-4 ring-1 ring-hairline transition-all hover:-translate-y-0.5 hover:ring-foreground/20 hover:shadow-[0_18px_50px_-28px_var(--foreground)] " +
                  (draggingId === f.id ? "scale-[0.99] opacity-60 ring-foreground/30" : "")
                }
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Move field up"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, f.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className="grid size-8 cursor-grab place-items-center rounded-xl bg-surface-muted text-muted-foreground ring-1 ring-hairline transition-colors hover:bg-secondary hover:text-foreground active:cursor-grabbing"
                      aria-label="Drag to reorder field"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === fields.length - 1}
                      className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                      aria-label="Move field down"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid flex-1 gap-3 md:grid-cols-[1fr_260px_auto]">
                    <input
                      value={f.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder="Field label"
                      className="h-11 rounded-xl bg-surface-muted px-3.5 text-sm ring-1 ring-hairline transition-shadow focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                    <Select
                      value={f.type}
                      onValueChange={(t) => update(i, { type: t as FieldType })}
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-surface-muted px-3 text-left text-sm shadow-none ring-1 ring-hairline transition-all hover:bg-secondary hover:ring-foreground/20 focus:ring-2 focus:ring-foreground/20">
                        <SelectValue>
                          <span className="flex min-w-0 items-center gap-2">
                            {(() => {
                              const Icon = FIELD_TYPE_META[f.type].icon;
                              return <Icon className="size-4 shrink-0 text-muted-foreground" />;
                            })()}
                            <span className="truncate">{FIELD_TYPE_LABELS[f.type]}</span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={6}
                        className="z-[100] min-w-[260px] rounded-2xl border-0 p-1.5 shadow-2xl ring-1 ring-hairline"
                      >
                        {FIELD_TYPES.map((t) => {
                          const Icon = FIELD_TYPE_META[t].icon;
                          return (
                            <SelectItem
                              key={t}
                              value={t}
                              className="cursor-pointer rounded-xl py-2.5 pl-2 pr-8 focus:bg-secondary"
                            >
                              <span className="flex items-center gap-3">
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-muted-foreground">
                                  <Icon className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1 text-left">
                                  <span className="block text-sm font-medium text-foreground">
                                    {FIELD_TYPE_LABELS[t]}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {FIELD_TYPE_META[t].description}
                                  </span>
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-muted px-3 text-xs font-medium ring-1 ring-hairline">
                      <input
                        className="accent-foreground"
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => update(i, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    {f.type === "select" && (
                      <input
                        value={(f.options ?? []).join(", ")}
                        onChange={(e) =>
                          update(i, {
                            options: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Options, comma separated"
                        className="h-11 rounded-xl bg-surface-muted px-3.5 text-sm ring-1 ring-hairline md:col-span-3"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                    className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete field"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            ))}

            <button
              onClick={() =>
                setFields((fs) => [
                  ...fs,
                  { id: rid(), type: "text", label: "New field", required: false },
                ])
              }
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-4" /> Add field
            </button>
          </div>
        ) : (
          <div className="mt-6">
            {data.submissions.length === 0 ? (
              <div className="rounded-2xl bg-surface p-16 text-center ring-1 ring-hairline">
                <p className="font-serif text-2xl">No responses yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Share your link to start collecting.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {data.submissions.map((s) => (
                  <li key={s.id} className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.submitted_at).toLocaleString()}{" "}
                        {s.submitter_email && `· ${s.submitter_email}`}
                      </div>
                      <button
                        onClick={() => delSubMut.mutate(s.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      {fields.map((f) => (
                        <div key={f.id} className="border-b border-hairline pb-1.5">
                          <dt className="text-xs text-muted-foreground">{f.label}</dt>
                          <dd className="font-medium">{String(s.data[f.id] ?? "—")}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
