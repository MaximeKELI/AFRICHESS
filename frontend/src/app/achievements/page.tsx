"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface BadgeEarned {
  badge: { icon: string; name: string; description: string };
  earned_at: string;
}

export default function AchievementsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [badges, setBadges] = useState<BadgeEarned[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    learningApi
      .myBadges()
      .then(({ data }) => setBadges(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setError(t("achievements.error")));
  }, [user, t]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="mb-4">{t("achievements.loginRequired")}</p>
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("achievements.title")}</h1>
      <p className="text-sm opacity-70 mb-8">{t("achievements.subtitle")}</p>
      {error && <InlineAlert className="mb-6">{error}</InlineAlert>}
      {badges.length === 0 ? (
        <p className="text-sm opacity-60">{t("learning.badges.empty")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((b, i) => (
            <div key={`${b.badge.name}-${i}`} className="glass-card p-5 text-center">
              <span className="text-4xl block mb-2" aria-hidden>
                {b.badge.icon}
              </span>
              <h2 className="font-semibold text-africhess-gold">{b.badge.name}</h2>
              <p className="text-xs opacity-70 mt-2">{b.badge.description}</p>
              <p className="text-[10px] opacity-40 mt-3">
                {new Date(b.earned_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
