"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notificationsApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import {
  NotificationList,
  type NotificationItem,
} from "@/components/notifications/NotificationList";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  useNotificationsWebSocket(
    Boolean(user),
    (snapshot) => setItems(snapshot as NotificationItem[]),
    (n) => {
      const item = n as NotificationItem;
      setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
    }
  );

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id);
    load();
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("friends.loginRequired")}</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold">{t("notifications.title")}</h1>
        {unread > 0 && (
          <button
            type="button"
            className="text-sm text-africhess-gold hover:underline"
            onClick={() => notificationsApi.markAllRead().then(load)}
          >
            {t("notifications.markAll")}
          </button>
        )}
      </div>

      {loadError && (
        <InlineAlert className="mb-4" onDismiss={() => setLoadError(null)}>
          {loadError}
        </InlineAlert>
      )}

      <NotificationList items={items} onMarkRead={markRead} />
    </div>
  );
}
