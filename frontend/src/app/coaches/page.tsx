"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { marketplaceApi } from "@/lib/learningApi";
import { useTranslation } from "@/hooks/useTranslation";

interface CoachRow {
  username: string;
  display_name: string;
  bio: string;
  fide_title: string;
  hourly_rate_eur: number;
  booking_url: string;
}

export default function CoachesPage() {
  const { t } = useTranslation();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);

  useEffect(() => {
    marketplaceApi.coaches().then(({ data }) => setCoaches(Array.isArray(data) ? data : [])).catch(() => setCoaches([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">← {t("nav.learn")}</Link>
      <h1 className="font-display text-3xl font-bold">{t("coaches.title")}</h1>
      <p className="text-sm opacity-60">{t("coaches.subtitle")}</p>

      <div className="space-y-4">
        {coaches.map((c) => (
          <div key={c.username} className="glass-card p-4 flex flex-wrap justify-between gap-4">
            <div>
              <p className="font-semibold">{c.display_name} {c.fide_title && <span className="text-africhess-gold text-sm">{c.fide_title}</span>}</p>
              <p className="text-sm opacity-70 mt-1">{c.bio}</p>
              <p className="text-xs opacity-50 mt-2">{t("coaches.rate", { rate: c.hourly_rate_eur })}</p>
            </div>
            {c.booking_url && (
              <a href={c.booking_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm african-gradient text-white rounded-lg h-fit">
                {t("coaches.book")}
              </a>
            )}
          </div>
        ))}
        {coaches.length === 0 && (
          <div className="glass-card p-6 text-sm space-y-2">
            <p className="opacity-70">{t("coaches.empty")}</p>
            <p className="text-xs opacity-50">{t("coaches.emptyHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
