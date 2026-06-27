"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export default function InsightsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [data, setData] = useState<{
    stats?: Record<string, unknown>;
    coach_tips?: { category: string; message: string }[];
    training_plan?: { day: string; focus: string }[];
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    learningApi.insights().then(({ data: d }) => setData(d)).catch(() => setData(null));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("insights.loginRequired")}</p>
        <Link href="/login" className="african-gradient text-white px-6 py-2 rounded-lg">{t("nav.login")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("insights.title")}</h1>
      <p className="text-sm opacity-60">{t("insights.subtitle")}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">{t("insights.coach")}</h2>
          {(data?.coach_tips ?? []).map((tip, i) => (
            <p key={i} className="text-sm border-l-2 border-africhess-gold pl-3">{tip.message}</p>
          ))}
        </div>

        <div className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">{t("insights.plan")}</h2>
          {(data?.training_plan ?? []).map((row, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-white/5 pb-2">
              <span className="text-africhess-gold">{row.day}</span>
              <span className="opacity-80">{row.focus}</span>
            </div>
          ))}
        </div>
      </div>

      {data?.stats && (
        <div className="glass-card p-4">
          <h2 className="font-semibold mb-3">{t("insights.stats")}</h2>
          <Link href="/stats" className="text-sm text-africhess-gold hover:underline">{t("insights.fullStats")} →</Link>
        </div>
      )}
    </div>
  );
}
