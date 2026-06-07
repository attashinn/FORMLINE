import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { createForm, deleteForm, listForms } from "@/lib/forms.functions";
import { FORM_TEMPLATES, type FormTemplate } from "@/lib/form-templates";
import { ArrowUpRight, Plus, Trash2, FileText, Sparkles } from "@/components/heroicons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/forms/")({
  head: () => ({ meta: [{ title: "Forms — Formline" }] }),
  component: FormsPage,
});

function FormsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listForms);
  const create = useServerFn(createForm);
  const del = useServerFn(deleteForm);

  const {
    data: forms = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["forms"],
    queryFn: () => list(),
    retry: 1,
    staleTime: 0,
  });
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const createMut = useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      fields: FormTemplate["fields"];
    }) => create({ data: payload }),
    onSuccess: (form) => {
      toast.success("Form created");
      qc.invalidateQueries({ queryKey: ["forms"] });
      navigate({ to: "/forms/$id", params: { id: form.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Form deleted");
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
  });

  function createBlank(t: string) {
    createMut.mutate({
      title: t,
      fields: [
        { id: "name", type: "text", label: "Your name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
      ],
    });
  }

  function createFromTemplate(tpl: FormTemplate) {
    createMut.mutate({ title: tpl.title, description: tpl.description, fields: tpl.fields });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <h1 className="font-serif text-5xl">Forms</h1>
            <p className="mt-2 text-muted-foreground">Build, share, and collect responses.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
          >
            <Plus className="size-4" /> Blank form
          </button>
        </motion.div>

        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 rounded-2xl bg-surface p-5 ring-1 ring-hairline"
          >
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Form title
            </label>
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client intake questionnaire"
                className="h-10 flex-1 rounded-lg bg-surface px-3 text-sm ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-foreground/80"
              />
              <button
                disabled={!title.trim() || createMut.isPending}
                onClick={() => createBlank(title.trim())}
                className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setTitle("");
                }}
                className="inline-flex h-10 items-center rounded-lg bg-surface px-4 text-sm ring-1 ring-hairline"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Templates */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Start from a template
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORM_TEMPLATES.map((tpl, i) => (
              <motion.button
                key={tpl.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
                onClick={() => createFromTemplate(tpl)}
                disabled={createMut.isPending}
                className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl bg-surface p-5 text-left ring-1 ring-hairline transition-all hover:ring-foreground/30 disabled:opacity-60"
              >
                <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
                  {tpl.tagline}
                </span>
                <div className="font-serif text-2xl leading-tight">{tpl.title}</div>
                <p className="text-sm text-muted-foreground">{tpl.description}</p>
                <div className="mt-auto flex w-full items-center justify-between pt-3 text-xs text-muted-foreground">
                  <span>{tpl.fields.length} fields</span>
                  <span className="inline-flex items-center gap-1 text-foreground/80 opacity-0 transition-opacity group-hover:opacity-100">
                    Use template <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Your forms */}
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your forms
          </h2>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-surface p-12 text-center text-muted-foreground ring-1 ring-hairline">
            Loading…
          </div>
        ) : isError ? (
          <div className="rounded-2xl bg-surface p-12 text-center ring-1 ring-hairline">
            <p className="font-serif text-2xl">Couldn&apos;t load forms</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Check your database connection."}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-6 inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background"
            >
              Try again
            </button>
          </div>
        ) : forms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-surface p-16 text-center ring-1 ring-hairline"
          >
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-serif text-2xl">No forms yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a template above or create a blank form.
            </p>
          </motion.div>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline">
            {forms.map((f, i) => (
              <motion.li
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="group relative flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#7C5CFF]/5"
              >
                <Link
                  to="/forms/$id"
                  params={{ id: f.id }}
                  aria-label={`Open ${f.title}`}
                  className="absolute inset-0 z-0"
                />
                <div className="pointer-events-none relative z-10 flex-1">
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.fields.length} fields · {f.is_published ? "Published" : "Draft"} · Updated{" "}
                    {new Date(f.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-[#7C5CFF]">
                    Open <ArrowUpRight className="size-3.5" />
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm("Delete this form and all its responses?")) delMut.mutate(f.id);
                    }}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
