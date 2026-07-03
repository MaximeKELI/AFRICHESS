"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";
import {
  NotificationList,
  type NotificationItem,
} from "@/components/notifications/NotificationList";

export function NotificationBell() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!user) return;
    notificationsApi
      .list()
      .then(({ data }) => {
        setItems(Array.isArray(data) ? data : data.results ?? []);
        setLoadError(null);
      })
      .catch((err) => {
        setItems([]);
        setLoadError(formatApiError(err, t("notifications.error.load")));
      });
  }, [user, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, [open, load]);

  useNotificationsWebSocket(
    Boolean(user),
    (snapshot) => setItems(snapshot as NotificationItem[]),
    (n) => {
      const item = n as NotificationItem;
      setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
    }
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;

  const unread = items.filter((n) => !n.is_read).length;

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-white/10 relative"
        aria-label={t("notifications.title")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] rounded-full bg-africhess-terracotta text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[3.75rem] sm:top-full sm:mt-2 w-auto sm:w-[min(100vw-1.5rem,26rem)] max-h-[min(75vh,36rem)] flex flex-col glass-card shadow-xl z-[200] text-sm overflow-hidden"
          role="region"
          aria-label={t("notifications.title")}
        >
          <div className="p-3 border-b border-white/10 flex justify-between items-center shrink-0">
            <span className="font-semibold">{t("notifications.title")}</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  type="button"
                  className="text-xs text-africhess-gold hover:underline"
                  onClick={() => notificationsApi.markAllRead().then(load)}
                >
                  {t("notifications.markAll")}
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-africhess-gold hover:underline"
              >
                {t("notifications.viewAll")}
              </Link>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {loadError ? (
              <p className="p-4 text-africhess-terracotta text-center text-xs">{loadError}</p>
            ) : (
              <NotificationList
                items={items}
                onMarkRead={markRead}
                onNavigate={() => setOpen(false)}
                compact
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
