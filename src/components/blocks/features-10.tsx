import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
  Send,
  Users,
} from "@/components/heroicons";
import type { ReactNode } from "react";

export function Features() {
  return (
    <section id="templates" className="border-t border-white/5 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#7C5CFF]">
            Ready in seconds
          </span>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Launch client intake without rebuilding the same form twice.
          </h2>
          <p className="mt-4 text-white/60">
            Start with proven onboarding flows, tailor the fields, and route every response into the
            client workspace your team already uses.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={LayoutTemplate}
                title="Template library"
                description="Spin up intake, project feedback, RSVP, hiring, and contact forms from polished defaults."
              />
            </CardHeader>

            <div className="relative mb-6 border-t border-dashed border-white/10 sm:mb-0">
              <div className="absolute inset-0 bg-[radial-gradient(125%_125%_at_50%_0%,transparent_40%,rgba(124,92,255,0.12),rgba(255,255,255,0.06)_125%)]" />
              <div className="relative aspect-[76/59] overflow-hidden px-6 py-8">
                <TemplatePreview />
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={Inbox}
                title="Response inbox"
                description="Submitted forms become searchable client records with status, timestamps, and next actions."
              />
            </CardHeader>

            <CardContent>
              <div className="relative mb-6 sm:mb-0">
                <div className="absolute -inset-6 bg-[radial-gradient(50%_50%_at_75%_50%,rgba(124,92,255,0.18),transparent_100%)]" />
                <div className="relative aspect-[76/59] overflow-hidden border border-white/10 bg-[#0A0A0B]">
                  <img
                    src="/hero-dashboard.svg"
                    alt="Formline dashboard showing active clients, filters, and intake responses"
                    width={1207}
                    height={929}
                    className="h-full w-full object-cover object-left-top"
                    loading="lazy"
                  />
                </div>
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard className="p-6 lg:col-span-2">
            <p className="mx-auto my-6 max-w-xl text-balance text-center text-2xl font-semibold text-white">
              Guided templates collect the right answers, then hand them to the right workflow.
            </p>

            <div className="flex justify-center gap-6 overflow-hidden">
              <CircularUI
                icon={ClipboardList}
                label="Intake"
                circles={[{ pattern: "border" }, { pattern: "border" }]}
              />

              <CircularUI
                icon={Send}
                label="Share"
                circles={[{ pattern: "none" }, { pattern: "primary" }]}
              />

              <CircularUI
                icon={Inbox}
                label="Receive"
                circles={[{ pattern: "blue" }, { pattern: "none" }]}
              />

              <CircularUI
                icon={Users}
                label="Profile"
                circles={[{ pattern: "primary" }, { pattern: "none" }]}
                className="hidden sm:block"
              />
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  children: ReactNode;
  className?: string;
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
  <Card
    className={cn(
      "group relative overflow-hidden rounded-none border-white/10 bg-white/[0.03] text-white shadow-zinc-950/5",
      className,
    )}
  >
    <CardDecorator />
    {children}
  </Card>
);

const CardDecorator = () => (
  <>
    <span className="absolute -left-px -top-px block size-2 border-l-2 border-t-2 border-[#7C5CFF]" />
    <span className="absolute -right-px -top-px block size-2 border-r-2 border-t-2 border-[#7C5CFF]" />
    <span className="absolute -bottom-px -left-px block size-2 border-b-2 border-l-2 border-[#7C5CFF]" />
    <span className="absolute -bottom-px -right-px block size-2 border-b-2 border-r-2 border-[#7C5CFF]" />
  </>
);

interface CardHeadingProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
  <div className="p-6">
    <span className="flex items-center gap-2 text-sm text-white/55">
      <Icon className="size-4 text-[#7C5CFF]" />
      {title}
    </span>
    <p className="mt-8 text-2xl font-semibold text-white">{description}</p>
  </div>
);

const TemplatePreview = () => {
  const templates = [
    { title: "Client intake", fields: 7, active: true },
    { title: "Project feedback", fields: 5, active: false },
    { title: "Contact request", fields: 4, active: false },
    { title: "Hiring brief", fields: 6, active: false },
  ];

  return (
    <div className="mx-auto max-w-md border border-white/10 bg-[#0A0A0B] p-4 shadow-2xl shadow-[#7C5CFF]/10">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-sm font-medium text-white">Form templates</p>
          <p className="text-xs text-white/40">Pick, edit, publish</p>
        </div>
        <div className="rounded-full bg-[#7C5CFF]/15 px-2.5 py-1 text-xs text-[#B8AAFF]">
          6 flows
        </div>
      </div>

      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.title}
            className={cn(
              "flex items-center justify-between border border-white/10 px-3 py-2",
              template.active ? "bg-[#7C5CFF]/15" : "bg-white/[0.03]",
            )}
          >
            <div>
              <p className="text-sm font-medium text-white">{template.title}</p>
              <p className="text-xs text-white/40">{template.fields} required fields</p>
            </div>
            <span
              className={cn(
                "size-2 rounded-full",
                template.active ? "bg-[#7C5CFF] shadow-[0_0_10px_#7C5CFF]" : "bg-white/20",
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface CircleConfig {
  pattern: "none" | "border" | "primary" | "blue";
}

interface CircularUIProps {
  icon: LucideIcon;
  label: string;
  circles: CircleConfig[];
  className?: string;
}

const CircularUI = ({ icon: Icon, label, circles, className }: CircularUIProps) => (
  <div className={className}>
    <div className="size-fit rounded-2xl bg-gradient-to-b from-white/15 to-transparent p-px">
      <div className="relative flex aspect-square w-fit items-center -space-x-4 rounded-[15px] bg-gradient-to-b from-[#111116] to-white/[0.03] p-4">
        {circles.map((circle, i) => (
          <div
            key={`${label}-${i}`}
            className={cn("grid size-8 place-items-center rounded-full border sm:size-9", {
              "border-[#7C5CFF] bg-[#0A0A0B]": circle.pattern === "none",
              "border-[#7C5CFF] bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.18),rgba(255,255,255,0.18)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "border",
              "border-[#7C5CFF] bg-[#0A0A0B] bg-[repeating-linear-gradient(-45deg,rgba(124,92,255,0.85),rgba(124,92,255,0.85)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "primary",
              "z-10 border-blue-500 bg-[#0A0A0B] bg-[repeating-linear-gradient(-45deg,theme(colors.blue.500),theme(colors.blue.500)_1px,transparent_1px,transparent_4px)]":
                circle.pattern === "blue",
            })}
          >
            {i === 0 ? <Icon className="size-3.5 text-white" /> : null}
          </div>
        ))}
      </div>
    </div>
    <span className="mt-1.5 block text-center text-sm text-white/55">{label}</span>
  </div>
);
