import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listSimulatedEmails, deleteSimulatedEmail } from "@/lib/forms.functions";
import {
  Mail,
  Search,
  Trash2,
  Loader2,
  X,
  ArrowUpRight,
} from "@/components/heroicons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/emails")({
  head: () => ({
    meta: [
      { title: "Emails Outbox — Formline" },
      {
        name: "description",
        content: "Browse outbound email previews and delivery status for notifications and automations.",
      },
    ],
  }),
  component: EmailsPage,
});

type EmailOutboxDelivery = "simulated" | "resend";

type OutboxEmail = {
  filename: string;
  to: string;
  subject: string;
  sentAt: string;
  previewUrl: string;
  resendId: string | null;
  success: boolean;
  delivery: EmailOutboxDelivery;
};

function DeliveryBadge({ delivery, success }: { delivery: EmailOutboxDelivery; success: boolean }) {
  if (delivery === "resend" && success) {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-500/20">
        Sent via Resend
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400 ring-1 ring-amber-500/20">
      Simulated only
    </span>
  );
}

function EmailsPage() {
  const queryClient = useQueryClient();
  const getEmails = useServerFn(listSimulatedEmails);
  const deleteEmail = useServerFn(deleteSimulatedEmail);

  const [query, setQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["simulated-emails"],
    queryFn: () => getEmails(),
    retry: 1,
    staleTime: 0,
  });

  const emails = data?.items ?? [];
  const resendConfigured = data?.resendConfigured ?? false;

  const deleteMut = useMutation({
    mutationFn: async (filename: string) => deleteEmail({ data: { filename } }),
    onSuccess: () => {
      toast.success("Email deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["simulated-emails"] });
      setSelectedEmail(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete email");
    },
  });

  const filteredEmails = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter(
      (email) =>
        email.to.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q),
    );
  }, [emails, query]);

  function handleDelete(e: React.MouseEvent, filename: string) {
    e.stopPropagation();
    if (confirm("Delete this outbox entry and its preview files?")) {
      deleteMut.mutate(filename);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[520px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.28),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
            Communications
          </span>
          <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
            Email <span className="italic text-muted-foreground">outbox</span>
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
            {resendConfigured ? (
              <>
                Every outbound email is logged here as an HTML preview. When delivery succeeds through
                Resend, the entry is marked <strong className="font-medium text-foreground">Sent via Resend</strong>.
                Failed or skipped sends stay as <strong className="font-medium text-foreground">Simulated only</strong> previews.
              </>
            ) : (
              <>
                Resend is not configured in this environment, so emails are{" "}
                <strong className="font-medium text-foreground">Simulated only</strong> — saved as HTML
                previews under <span className="font-mono text-xs">public/emails/</span> for local review.
                Set <span className="font-mono text-xs">RESEND_API_KEY</span> and{" "}
                <span className="font-mono text-xs">RESEND_FROM_EMAIL</span> in production to deliver for real.
              </>
            )}
          </p>
        </motion.section>

        <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by recipient or subject…"
              className="h-10 w-full rounded-lg bg-surface pl-9 pr-4 text-sm ring-1 ring-hairline outline-none transition-shadow focus:ring-2 focus:ring-foreground/80"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex h-9 items-center rounded-lg bg-surface px-4 text-sm font-medium ring-1 ring-hairline transition-colors hover:bg-secondary"
          >
            Refresh
          </button>
        </section>

        {isLoading ? (
          <div className="rounded-2xl bg-surface px-6 py-16 text-center ring-1 ring-hairline flex flex-col items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[#7C5CFF]" />
            <p className="mt-2 text-sm text-muted-foreground">Loading outbox…</p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="rounded-2xl bg-surface px-6 py-16 text-center ring-1 ring-hairline">
            <Mail className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-serif text-2xl">No emails in the outbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query
                ? "Try resetting your search query."
                : "Send a form link, trigger an automation, or receive a form response to populate this list."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline">
            {filteredEmails.map((email, i) => (
              <motion.li
                key={email.filename}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onClick={() => setSelectedEmail(email)}
                className="group relative flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4 transition-colors hover:bg-[#7C5CFF]/5 cursor-pointer"
              >
                <div className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl bg-surface-muted border border-hairline text-muted-foreground group-hover:text-[#7C5CFF] group-hover:border-[#7C5CFF]/30 transition-colors">
                  <Mail className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {email.subject}
                    </div>
                    <DeliveryBadge delivery={email.delivery} success={email.success} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-foreground/80 font-medium truncate max-w-[140px] sm:max-w-[220px]">
                      {email.to}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums whitespace-nowrap">
                      {new Date(email.sentAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-[#7C5CFF] transition-colors font-medium whitespace-nowrap">
                    Preview <ArrowUpRight className="size-3" />
                  </span>
                  <ArrowUpRight className="sm:hidden size-3.5 text-muted-foreground group-hover:text-[#7C5CFF] transition-colors" />
                  <button
                    onClick={(e) => handleDelete(e, email.filename)}
                    disabled={deleteMut.isPending}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Delete outbox entry"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </main>

      <AnimatePresence>
        {selectedEmail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmail(null)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed inset-4 md:inset-x-12 md:inset-y-16 max-w-4xl mx-auto z-50 rounded-2xl bg-surface border border-hairline shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-hairline bg-surface-muted/50 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#7C5CFF]">
                      Email preview
                    </span>
                    <DeliveryBadge delivery={selectedEmail.delivery} success={selectedEmail.success} />
                  </div>
                  <h3 className="font-serif text-xl text-foreground truncate mt-0.5">
                    {selectedEmail.subject}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    To: <span className="text-foreground font-medium">{selectedEmail.to}</span> ·{" "}
                    {new Date(selectedEmail.sentAt).toLocaleString()}
                    {selectedEmail.resendId && (
                      <>
                        {" "}
                        · Resend ID:{" "}
                        <span className="font-mono text-foreground/80">{selectedEmail.resendId}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-hairline"
                  aria-label="Close preview"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 bg-white p-4 relative">
                <iframe
                  src={selectedEmail.previewUrl}
                  title="Email preview"
                  className="w-full h-full border-0 rounded-lg bg-white"
                />
              </div>

              <div className="p-4 border-t border-hairline bg-surface-muted/50 flex items-center justify-between gap-4 shrink-0">
                <div className="text-[11px] text-muted-foreground max-w-md">
                  {selectedEmail.delivery === "resend" && selectedEmail.success ? (
                    <>Delivered through Resend. HTML preview stored at{" "}
                      <span className="font-mono bg-surface px-1 rounded">/public{selectedEmail.previewUrl}</span>.
                    </>
                  ) : (
                    <>Local preview only — not delivered. Files at{" "}
                      <span className="font-mono bg-surface px-1 rounded">/public{selectedEmail.previewUrl}</span>
                      {resendConfigured ? " (Resend send failed or was skipped)." : " (Resend not configured)."}
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-xs font-medium text-background shrink-0"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
