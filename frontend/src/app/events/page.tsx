"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface PlatformEvent {
  id: number;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  ends_at?: string | null;
  url_path: string;
  is_featured: boolean;
}

export default function EventsPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<PlatformEvent[]>([]);

  useEffect(() => {
    socialApi.platformEvents().then(({ data }) => setEvents(data)).catch(() => setEvents([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("events.title")}</h1>
      <p className="text-sm opacity-70">{t("events.subtitle")}</p>
      <div className="space-y-3">
        {events.length === 0 && (
          <p className="text-sm opacity-50">{t("events.empty")}</p>
        )}
        {events.map((e) => (
          <article
            key={e.id}
            className={`glass-card p-4 ${e.is_featured ? "border border-africhess-gold/40" : ""}`}
          >
            <div className="flex justify-between gap-2 items-start">
              <div>
                <h2 className="font-semibold">{e.title}</h2>
                <p className="text-xs opacity-60 mt-1">
                  {new Date(e.starts_at).toLocaleString()} · {t(`events.type.${e.event_type}`)}
                </p>
                {e.description && <p className="text-sm mt-2 opacity-80">{e.description}</p>}
              </div>
              {e.url_path && (
                <Link href={e.url_path} className="text-sm text-africhess-gold shrink-0 hover:underline">
                  {t("events.join")}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      <Link href="/tournaments" className="text-sm text-africhess-gold hover:underline">
        {t("events.allTournaments")}
      </Link>
    </div>
  );
}
