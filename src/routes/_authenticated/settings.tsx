import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useClerk } from "@clerk/tanstack-react-start";
import {
  User,
  Mail,
  Shield,
  Zap,
  LogOut,
  Check,
  Loader2,
} from "@/components/heroicons";
import { getSettings, updateSettings, type OwnerSettings } from "@/lib/settings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Formline" },
      {
        name: "description",
        content: "Manage your workspace preferences, notifications, and account settings.",
      },
    ],
  }),
  component: SettingsPage,
});

type TabId = "account" | "notifications" | "security";

type NotifKey =
  | "notificationFormSubmit"
  | "notificationClientStatusChange"
  | "notificationWeeklyDigest"
  | "notificationFormPublished";

const NOTIF_ITEMS: Array<{
  key: NotifKey;
  label: string;
  desc: string;
}> = [
  {
    key: "notificationFormSubmit",
    label: "New form response",
    desc: "Get notified every time someone submits one of your forms.",
  },
  {
    key: "notificationClientStatusChange",
    label: "Client status change",
    desc: "Alerts when a client's pipeline status is updated.",
  },
  {
    key: "notificationWeeklyDigest",
    label: "Weekly digest",
    desc: "A summary of your workspace activity every Monday.",
  },
  {
    key: "notificationFormPublished",
    label: "Form published",
    desc: "Confirmation when you publish or unpublish a form.",
  },
];

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Mail },
  { id: "security", label: "Security", icon: Shield },
];

function SettingsPage() {
  const { user } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("account");

  const fetchSettings = useServerFn(getSettings);
  const saveSettings = useServerFn(updateSettings);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["owner-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 30_000,
  });

  const settingsMutation = useMutation({
    mutationFn: (patch: Partial<OwnerSettings>) => saveSettings({ data: patch }),
    onSuccess: (next) => {
      queryClient.setQueryData(["owner-settings"], next);
      toast.success("Notification settings saved");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    },
  });

  function toggleNotification(key: NotifKey) {
    if (!settings) return;
    const next = !settings[key];
    settingsMutation.mutate({ [key]: next });
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  const fullName = user?.user_metadata?.full_name || "";
  const email = user?.email || "";
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[400px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.18),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">

        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
            Workspace
          </span>
          <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
            Settings <span className="italic text-muted-foreground">& preferences</span>
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
            Manage your account, notifications, and workspace configuration.
          </p>
        </motion.section>

        <div className="flex flex-col gap-6 md:flex-row md:gap-10">

          {/* Sidebar Tabs */}
          <nav className="flex md:flex-col gap-1 md:w-44 shrink-0 overflow-x-auto pb-1 md:pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all text-left ${
                    active
                      ? "bg-[#7C5CFF]/10 text-white ring-1 ring-[#7C5CFF]/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${active ? "text-[#7C5CFF]" : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Panel */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >

              {/* ── Account Tab ── */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  {/* Profile card */}
                  <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
                    <div className="px-6 py-4 border-b border-hairline bg-surface-muted/50">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Profile</h2>
                    </div>
                    <div className="p-6 flex items-center gap-5">
                      <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-[#7C5CFF] to-[#A28CFF] text-white font-semibold text-xl">
                        {initials}
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-foreground">{fullName || "No name set"}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">{email}</div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          To update your name, email, or password, go to the{" "}
                          <a href="/profile" className="text-[#7C5CFF] underline underline-offset-2 hover:opacity-80">
                            Profile page
                          </a>
                          .
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workspace info */}
                  <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
                    <div className="px-6 py-4 border-b border-hairline bg-surface-muted/50">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</h2>
                    </div>
                    <div className="divide-y divide-hairline">
                      {[
                        { label: "Plan", value: "Free Beta" },
                        { label: "Forms", value: "Unlimited" },
                        { label: "Responses", value: "Unlimited" },
                        { label: "Team members", value: "1 (solo)" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between px-6 py-4">
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                          <span className="text-sm font-medium text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="rounded-2xl bg-surface ring-1 ring-destructive/20 overflow-hidden">
                    <div className="px-6 py-4 border-b border-hairline bg-destructive/5">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-destructive">Danger Zone</h2>
                    </div>
                    <div className="p-6 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">Sign out of Formline</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">You can sign back in at any time.</div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="size-3.5" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Notifications Tab ── */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
                    <div className="px-6 py-4 border-b border-hairline bg-surface-muted/50">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email Notifications</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Sent to <span className="font-medium text-foreground">{email}</span></p>
                    </div>
                    {settingsLoading ? (
                      <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading preferences…
                      </div>
                    ) : (
                    <div className="divide-y divide-hairline">
                      {NOTIF_ITEMS.map((item) => {
                        const enabled = settings?.[item.key] ?? false;
                        const saving =
                          settingsMutation.isPending &&
                          settingsMutation.variables?.[item.key] !== undefined;
                        return (
                        <div key={item.key} className="flex items-center justify-between px-6 py-4 gap-4">
                          <div>
                            <div className="text-sm font-medium text-foreground">{item.label}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{item.desc}</div>
                          </div>
                          <button
                            type="button"
                            disabled={settingsMutation.isPending}
                            onClick={() => toggleNotification(item.key)}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
                              enabled ? "bg-[#7C5CFF]" : "bg-surface-muted ring-1 ring-hairline"
                            }`}
                          >
                            <span
                              className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
                                enabled ? "translate-x-5" : "translate-x-0.5"
                              } mt-0.5`}
                            />
                            {saving && (
                              <span className="absolute -right-6 top-0.5">
                                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                              </span>
                            )}
                          </button>
                        </div>
                        );
                      })}
                    </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 flex items-start gap-3">
                    <Zap className="size-4 text-[#7C5CFF] shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Saved to your workspace. </span>
                      Form response and weekly digest toggles take effect immediately for email notifications.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Security Tab ── */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
                    <div className="px-6 py-4 border-b border-hairline bg-surface-muted/50">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Account Security</h2>
                    </div>
                    <div className="divide-y divide-hairline">
                      {[
                        { label: "Authentication", value: "Clerk (OAuth + Email)", ok: true },
                        { label: "Session management", value: "Managed by Clerk", ok: true },
                        { label: "Data isolation", value: "Per-user row-level security", ok: true },
                        { label: "Two-factor auth", value: "Available via Profile settings", ok: true },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between px-6 py-4 gap-4">
                          <div>
                            <div className="text-sm font-medium text-foreground">{row.label}</div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {row.ok && <Check className="size-3.5 text-emerald-400" />}
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 flex items-start gap-3">
                    <Shield className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Your data is protected. </span>
                      All authentication and session management is handled by Clerk. To manage your password, 2FA, or connected accounts, visit the{" "}
                      <a href="/profile" className="text-[#7C5CFF] underline underline-offset-2 hover:opacity-80">
                        Profile page
                      </a>
                      .
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
