import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2 } from "@/components/heroicons";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications.functions";
import { formatRelative } from "@/lib/clients-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function dedupeNotifications<T extends { id: string; message: string; createdAt: string }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = item.message.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const fetchNotifications = useServerFn(listNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllReadFn = useServerFn(markAllNotificationsRead);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const displayNotifications = useMemo(() => dedupeNotifications(notifications), [notifications]);

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

  const unreadCount = displayNotifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-hairline"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold tabular-nums text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="w-[min(calc(100vw-2rem),24rem)] max-w-none p-0 rounded-2xl bg-surface border-hairline shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-hairline bg-surface-muted/50">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground shrink-0">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              className="inline-flex items-center gap-1.5 text-xs text-[#7C5CFF] hover:text-[#6C4AFF] font-medium transition-colors shrink-0 whitespace-nowrap"
            >
              <Check className="size-3.5 shrink-0" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        <div className="max-h-[min(360px,60vh)] overflow-y-auto overflow-x-hidden overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <Loader2 className="size-4 animate-spin text-[#7C5CFF]" />
              <span>Loading...</span>
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-muted-foreground">
              All caught up! No notifications.
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {displayNotifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-4 transition-colors hover:bg-surface-muted/30 ${
                    !n.read ? "bg-[#7C5CFF]/5" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => {
                          if (!n.read) markReadMutation.mutate(n.id);
                          setOpen(false);
                        }}
                        className="block group"
                      >
                        <p className="text-xs text-foreground font-medium leading-relaxed break-words group-hover:underline">
                          {n.message}
                        </p>
                      </Link>
                    ) : (
                      <p className="text-xs text-foreground font-medium leading-relaxed break-words">
                        {n.message}
                      </p>
                    )}
                    <time
                      dateTime={n.createdAt}
                      className="mt-1.5 block text-[10px] tabular-nums text-muted-foreground"
                    >
                      {formatRelative(n.createdAt)}
                    </time>
                  </div>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
