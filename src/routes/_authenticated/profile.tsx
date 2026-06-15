import { createFileRoute, Link } from "@tanstack/react-router";
import { UserProfile } from "@clerk/tanstack-react-start";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { ArrowLeft } from "@/components/heroicons";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — Formline" },
      {
        name: "description",
        content: "Customize your workspace profile details and security credentials.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="relative min-h-screen bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[520px] before:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,92,255,0.28),transparent_60%)] before:content-['']">
      <main className="relative mx-auto max-w-5xl px-6 py-12 lg:px-8">
        {/* Navigation Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="my-8"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C5CFF]">
            User Settings
          </span>
          <h1 className="mt-3 font-serif text-5xl leading-tight">
            Profile <span className="italic text-muted-foreground">customization</span>
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
            Update your profile details, manage active sessions, configure two-factor authentication, or modify credentials securely.
          </p>
        </motion.section>

        {/* Clerk UserProfile Wrapper */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex justify-center py-6"
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-hairline bg-surface/50 p-2 shadow-2xl backdrop-blur-md [&_.cl-footer]:hidden [&_.cl-developmentModeNotice]:hidden [&_[class*='footer']]:hidden">
            <UserProfile appearance={clerkAppearance} />
          </div>
        </motion.section>
      </main>
    </div>
  );
}
