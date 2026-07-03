"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";

export function MessagesNavButton() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    if (!user) return;
    notificationsApi
      .list()
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : data.results ?? [];
        const count = items.filter(
          (n: { type: string; is_read: boolean }) =>
            n.type === "direct_message" && !n.is_read
        ).length;
        setUnread(count);
      })
      .catch(() => setUnread(0));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useNotificationsWebSocket(Boolean(user), () => load(), () => load());

  if (!user) return null;

  return (
    <Link
      href="/messages"
      className="p-2 rounded-lg hover:bg-white/10 relative"
      aria-label={t("friends.messages.title")}
      title={t("friends.messages.title")}
    >
      <MessageCircle size={18} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 text-[10px] rounded-full bg-africhess-terracotta text-white flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
