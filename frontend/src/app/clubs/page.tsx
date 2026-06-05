"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

interface Club {
  id: number;
  name: string;
  slug: string;
  description: string;
  country: string;
  member_count: number;
}

export default function ClubsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    socialApi.clubs().then(({ data }) => setClubs(Array.isArray(data) ? data : data.results ?? []));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">{t("clubs.title")}</h1>
      {!user && <p className="mb-4 opacity-70">{t("clubs.loginHint")}</p>}
      <div className="space-y-4">
        {clubs.map((c) => (
          <article key={c.id} className="glass-card p-5">
            <h2 className="font-semibold text-lg">{c.name}</h2>
            <p className="text-sm opacity-70 mt-1">{c.description || "—"}</p>
            <p className="text-xs mt-2 opacity-50">
              {t("clubs.members", { count: c.member_count })}{c.country && ` · ${c.country}`}
            </p>
          </article>
        ))}
        {clubs.length === 0 && <p className="opacity-60">{t("clubs.empty")}</p>}
      </div>
      <p className="mt-8 text-sm">
        <Link href="/community" className="text-africhess-gold underline">
          {t("nav.community")} →
        </Link>
      </p>
    </div>
  );
}
