import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Paperclip, X } from "@/components/heroicons";
import { SiteHeader } from "@/components/site-header";
import { useClients, type ClientFile } from "@/lib/clients-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/intake")({
  head: () => ({
    meta: [
      { title: "Client Intake — Client Profile Hub" },
      {
        name: "description",
        content:
          "A calm, multi-step intake form to capture every detail of a new client engagement.",
      },
      { property: "og:title", content: "Client Intake — Client Profile Hub" },
      {
        property: "og:description",
        content:
          "A calm, multi-step intake form to capture every detail of a new client engagement.",
      },
    ],
  }),
  component: Intake,
});

type Draft = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  website: string;
  location: string;
  companySize: string;
  brandColors: string[];
  styleReferences: string;
  goals: string;
  budget: string;
  deadline: string;
  services: string[];
  notes: string;
  files: ClientFile[];
};

const empty: Draft = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  industry: "",
  website: "",
  location: "",
  companySize: "",
  brandColors: ["#18181b", "#a8a29e", "#fafaf9"],
  styleReferences: "",
  goals: "",
  budget: "",
  deadline: "",
  services: [],
  notes: "",
  files: [],
};

const STEPS = [
  { key: "personal", label: "Personal" },
  { key: "business", label: "Business" },
  { key: "branding", label: "Branding" },
  { key: "project", label: "Project" },
  { key: "notes", label: "Review" },
] as const;

const INDUSTRIES = [
  "Architecture & Interior Design",
  "Consumer Technology",
  "E-commerce",
  "Hospitality & Travel",
  "Health & Wellness",
  "Finance",
  "Urban Design",
  "Education",
  "Other",
];

const SERVICES = [
  "Brand identity",
  "Website design",
  "E-commerce",
  "Content strategy",
  "Photography direction",
  "App design",
  "SEO",
];

const DRAFT_KEY = "cph.intake.draft.v1";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Intake() {
  const navigate = useNavigate();
  const { addClient } = useClients();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(empty);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Load draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...empty, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      // ignore corrupt or unavailable storage
    }
  }, []);

  // Autosave
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // ignore quota or unavailable storage
      }
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (step === 0) {
      if (!draft.fullName.trim()) e.fullName = "Full name is required";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) e.email = "Enter a valid email";
      if (!draft.company.trim()) e.company = "Company is required";
    }
    if (step === 1) {
      if (!draft.industry) e.industry = "Pick an industry";
    }
    if (step === 3) {
      if (!draft.goals.trim()) e.goals = "Briefly describe the goals";
    }
    return e;
  }, [draft, step]);

  const canContinue = Object.keys(errors).length === 0;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleService(s: string) {
    setDraft((d) => ({
      ...d,
      services: d.services.includes(s) ? d.services.filter((x) => x !== s) : [...d.services, s],
    }));
  }

  async function onFiles(list: FileList | null) {
    if (!list) return;
    const incoming: ClientFile[] = [];
    for (const file of Array.from(list).slice(0, 8)) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 4 MB and was skipped.`);
        continue;
      }
      const dataUrl = await fileToDataUrl(file);
      incoming.push({
        id: `f-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      });
    }
    setDraft((d) => ({ ...d, files: [...d.files, ...incoming] }));
  }

  function submit() {
    const record = addClient(draft);
    localStorage.removeItem(DRAFT_KEY);
    toast.success(`${record.company} added to your workspace`);
    navigate({ to: "/clients/$id", params: { id: record.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        <header className="mb-10 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            New engagement
          </span>
          <h1 className="mt-3 font-serif text-5xl leading-tight">
            Client <span className="italic text-muted-foreground">intake</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            Tell us about the project. We'll save your progress as you go, so you can step away any
            time.
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-3">
              <div
                className={
                  "grid size-7 place-items-center rounded-full text-[11px] font-semibold transition-colors " +
                  (i < step
                    ? "bg-foreground text-background"
                    : i === step
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground")
                }
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={"h-px flex-1 " + (i < step ? "bg-foreground" : "bg-hairline")} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-surface p-8 ring-1 ring-hairline lg:p-10">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Step {String(step + 1).padStart(2, "0")} of {String(STEPS.length).padStart(2, "0")} ·{" "}
              {STEPS[step].label}
            </span>
            <span className="text-xs text-muted-foreground">
              {savedAt ? `Draft saved · ${savedAt}` : "Autosaving…"}
            </span>
          </div>

          {/* Step content */}
          {step === 0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Full name" error={errors.fullName}>
                <input
                  className={inputCls}
                  value={draft.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  className={inputCls}
                  value={draft.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@studio.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputCls}
                  value={draft.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1 555 0100"
                />
              </Field>
              <Field label="Company" error={errors.company}>
                <input
                  className={inputCls}
                  value={draft.company}
                  onChange={(e) => set("company", e.target.value)}
                  placeholder="Studio Northwood"
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Industry" error={errors.industry}>
                <select
                  className={inputCls}
                  value={draft.industry}
                  onChange={(e) => set("industry", e.target.value)}
                >
                  <option value="">Select an industry…</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Website">
                <input
                  className={inputCls}
                  value={draft.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="studio.com"
                />
              </Field>
              <Field label="Location">
                <input
                  className={inputCls}
                  value={draft.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Brooklyn, NY"
                />
              </Field>
              <Field label="Company size">
                <select
                  className={inputCls}
                  value={draft.companySize}
                  onChange={(e) => set("companySize", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option>Solo</option>
                  <option>2–10</option>
                  <option>11–50</option>
                  <option>51–200</option>
                  <option>200+</option>
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Field label="Brand colors">
                <div className="flex flex-wrap gap-3">
                  {draft.brandColors.map((c, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-surface-muted px-2 py-1.5 ring-1 ring-hairline"
                    >
                      <input
                        type="color"
                        value={c}
                        onChange={(e) =>
                          set(
                            "brandColors",
                            draft.brandColors.map((x, j) => (j === i ? e.target.value : x)),
                          )
                        }
                        className="size-7 cursor-pointer rounded border-0 bg-transparent"
                      />
                      <span className="font-mono text-xs uppercase">{c}</span>
                      {draft.brandColors.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "brandColors",
                              draft.brandColors.filter((_, j) => j !== i),
                            )
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </label>
                  ))}
                  {draft.brandColors.length < 5 && (
                    <button
                      type="button"
                      onClick={() => set("brandColors", [...draft.brandColors, "#cccccc"])}
                      className="rounded-lg border border-dashed border-hairline px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Add color
                    </button>
                  )}
                </div>
              </Field>

              <Field label="Style references">
                <textarea
                  className={inputCls + " min-h-[110px] resize-none"}
                  value={draft.styleReferences}
                  onChange={(e) => set("styleReferences", e.target.value)}
                  placeholder="Inspiration, mood, references…"
                />
              </Field>

              <Field label="Logo & reference files">
                <label className="group flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-surface-muted text-center transition-colors hover:bg-secondary">
                  <Paperclip className="mb-2 size-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Drop logo, brand guidelines or moodboards · up to 4 MB each
                  </p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
                {draft.files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {draft.files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-xs ring-1 ring-hairline"
                      >
                        <span className="truncate">{f.name}</span>
                        <button
                          onClick={() =>
                            set(
                              "files",
                              draft.files.filter((x) => x.id !== f.id),
                            )
                          }
                          className="ml-3 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Field label="Project goals" error={errors.goals}>
                <textarea
                  className={inputCls + " min-h-[140px] resize-none"}
                  value={draft.goals}
                  onChange={(e) => set("goals", e.target.value)}
                  placeholder="What does success look like?"
                />
              </Field>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Budget">
                  <input
                    className={inputCls}
                    value={draft.budget}
                    onChange={(e) => set("budget", e.target.value)}
                    placeholder="$10,000 – $15,000"
                  />
                </Field>
                <Field label="Deadline">
                  <input
                    type="date"
                    className={inputCls}
                    value={draft.deadline}
                    onChange={(e) => set("deadline", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Services needed">
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map((s) => {
                    const on = draft.services.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleService(s)}
                        className={
                          "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors " +
                          (on
                            ? "bg-foreground text-background ring-foreground"
                            : "bg-surface text-foreground ring-hairline hover:bg-secondary")
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <Field label="Internal notes (optional)">
                <textarea
                  className={inputCls + " min-h-[110px] resize-none"}
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Anything the team should know."
                />
              </Field>

              <div className="rounded-2xl bg-surface-muted p-5 ring-1 ring-hairline">
                <h3 className="font-serif text-2xl">Review</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A quick glance before you submit.
                </p>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  {[
                    ["Contact", `${draft.fullName || "—"} · ${draft.email || "—"}`],
                    ["Company", draft.company || "—"],
                    ["Industry", draft.industry || "—"],
                    ["Location", draft.location || "—"],
                    ["Budget", draft.budget || "—"],
                    ["Deadline", draft.deadline || "—"],
                    ["Services", draft.services.join(", ") || "—"],
                    ["Files", `${draft.files.length} attached`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-4 border-b border-hairline pb-2"
                    >
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-10 flex items-center justify-between border-t border-hairline pt-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ArrowLeft className="size-4" /> Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background ring-1 ring-foreground transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background ring-1 ring-foreground transition-colors hover:bg-foreground/90"
              >
                Submit intake <Check className="size-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg bg-surface-muted px-3 text-sm text-foreground ring-1 ring-hairline outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-foreground/80";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
