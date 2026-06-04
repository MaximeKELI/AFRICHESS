"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: { game_id?: string; mode?: string };
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!user) return;
    notificationsApi
      .list()
      .then(({ data }) => setItems(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  useEffect(() => {
    if (!user || !open) return;
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, [user, open]);

  useNotificationsWebSocket(
    Boolean(user),
    (snapshot) => setItems(snapshot as Notification[]),
    (n) => {
      const item = n as Notification;
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
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] rounded-full bg-africhess-terracotta text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card shadow-xl z-50 text-sm">
          <div className="p-3 border-b border-white/10 flex justify-between items-center">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-africhess-gold"
                onClick={() => notificationsApi.markAllRead().then(load)}
              >
                Tout lire
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-4 opacity-60 text-center">Aucune notification</p>
          ) : (
            items.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b border-white/5 ${n.is_read ? "opacity-70" : ""}`}
              >
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-xs opacity-80 mt-1">{n.body}</p>}
                {n.type === "game_invite" && n.data?.game_id && (
                  <Link
                    href={`/play?game=${n.data.game_id}`}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className="text-xs text-africhess-green mt-2 inline-block hover:underline"
                  >
                    Rejoindre la partie →
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
