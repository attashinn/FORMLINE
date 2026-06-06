import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getPublicForm, submitPublicForm } from "@/lib/forms.functions";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/f/$token")({
  head: () => ({ meta: [{ title: "Complete form" }] }),
  component: PublicForm,
});

function PublicForm() {
  const { token } = Route.useParams();
  const get = useServerFn(getPublicForm);
  const submit = useServerFn(submitPublicForm);
  const {
    data: form,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-form", token],
    queryFn: () => get({ data: { token } }),
    retry: 1,
  });

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: async () =>
      submit({
        data: {
          token,
          data: values as Record<string, never>,
          submitter_name: name || undefined,
          submitter_email: email || undefined,
        },
      }),
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white">
        <div className="mx-auto max-w-xl px-6 py-20 text-center text-white/60">
          <Loader2 className="mx-auto size-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white">
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold">This form did not load</h1>
          <p className="mt-2 text-white/60">
            {error instanceof Error
              ? error.message
              : "Refresh the page or ask the sender for a new link."}
          </p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white">
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold">Form unavailable</h1>
          <p className="mt-2 text-white/60">
            This link may have expired or the form was unpublished.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white">
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#7C5CFF]/20 text-[#7C5CFF]">
            <Check className="size-7" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold">Thank you</h1>
          <p className="mt-2 text-white/60">Your response has been received.</p>
        </div>
      </div>
    );
  }

  const fields = Array.isArray(form.fields) ? form.fields : [];

  function set(id: string, v: unknown) {
    setValues((s) => ({ ...s, [id]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (
        f.required &&
        (values[f.id] === undefined || values[f.id] === "" || values[f.id] === false)
      ) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    mut.mutate();
  }

  const inp =
    "h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#7C5CFF] focus:outline-none";

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E5E5E7]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(124,92,255,0.2),transparent_70%)]" />
      <div className="relative mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{form.title}</h1>
        {form.description && <p className="mt-3 text-white/60">{form.description}</p>}

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={inp}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              className={inp}
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {fields.map((f) => (
            <div key={f.id}>
              <label className="mb-1.5 block text-sm text-white/80">
                {f.label} {f.required && <span className="text-[#7C5CFF]">*</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  className={inp + " min-h-[110px] py-2.5"}
                  value={String(values[f.id] ?? "")}
                  onChange={(e) => set(f.id, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : f.type === "select" ? (
                <select
                  className={inp}
                  value={String(values[f.id] ?? "")}
                  onChange={(e) => set(f.id, e.target.value)}
                >
                  <option value="">Select…</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={!!values[f.id]}
                    onChange={(e) => set(f.id, e.target.checked)}
                  />
                  Yes
                </label>
              ) : (
                <input
                  type={
                    f.type === "date"
                      ? "date"
                      : f.type === "number"
                        ? "number"
                        : f.type === "email"
                          ? "email"
                          : f.type === "tel"
                            ? "tel"
                            : "text"
                  }
                  className={inp}
                  value={String(values[f.id] ?? "")}
                  onChange={(e) => set(f.id, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}

          <button
            disabled={mut.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7C5CFF] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
