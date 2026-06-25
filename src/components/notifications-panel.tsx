import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2 } from "@/components/heroicons";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications.functions";
import { formatRelative } from "@/lib/clients-store";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const fetchNotifications = useServerFn(listNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllReadFn = useServerFn(markAllNotificationsRead);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 5000, // Poll every 5s
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markReadFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllReadFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-hairline"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 md:left-0 md:right-auto mt-2 w-80 sm:w-96 rounded-2xl bg-surface border border-hairline shadow-[0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-surface-muted/50">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-[#7C5CFF] hover:text-[#6C4AFF] font-medium flex items-center gap-1 transition-colors"
                >
                  <Check className="size-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-hairline">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                  <Loader2 className="size-4 animate-spin text-[#7C5CFF]" />
                  <span>Loading...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  All caught up! No notifications.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between p-4 transition-colors hover:bg-surface-muted/30 ${
                      !n.read ? "bg-[#7C5CFF]/5" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      {n.link ? (
                        <Link
                          to={n.link}
                          onClick={() => {
                            if (!n.read) markReadMutation.mutate(n.id);
                            setIsOpen(false);
                          }}
                          className="block group"
                        >
                          <p className="text-xs text-foreground font-medium break-words leading-relaxed group-hover:underline">
                            {n.message}
                          </p>
                        </Link>
                      ) : (
                        <p className="text-xs text-foreground font-medium break-words leading-relaxed">
                          {n.message}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1.5 block">
                        {formatRelative(n.createdAt)}
                      </span>
                    </div>

                    {!n.read && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
