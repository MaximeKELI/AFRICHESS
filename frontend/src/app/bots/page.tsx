"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { getAiAvatarSrc } from "@/lib/avatars";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

interface Bot {
  slug: string;
  name: string;
  name_en: string;
  country: string;
  elo: number;
  avatar_id: string;
  personality: string;
  opening_style: string;
  description: string;
  description_en: string;
  is_premium: boolean;
  is_legend?: boolean;
  games_played: number;
}

export default function BotsPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuthStore();
  const [bots, setBots] = useState<Bot[]>([]);
  const [featured, setFeatured] = useState<Bot[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "legends" | "free" | "premium">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gamesApi.bots({ legends: true }).then(({ data }) => {
      const list: Bot[] = Array.isArray(data) ? data : data.results ?? [];
      setFeatured(list.slice(0, 8));
    }).catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    gamesApi
      .bots({
        q: q || undefined,
        premium: filter === "premium" ? true : filter === "free" ? false : undefined,
        legends: filter === "legends",
      })
      .then(({ data }) => {
        const list: Bot[] = Array.isArray(data) ? data : data.results ?? [];
        setBots(list);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("bots.error.load"))))
      .finally(() => setLoading(false));
  }, [q, filter, t]);

  const label = (b: Bot) => (locale === "fr" ? b.name : b.name_en || b.name);
  const desc = (b: Bot) => (locale === "fr" ? b.description : b.description_en || b.description);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("bots.title")}</h1>
      <p className="opacity-70 mb-6">{t("bots.subtitle")}</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("bots.search")}
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 bg-transparent"
        />
        {(["all", "legends", "free", "premium"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm border ${
              filter === f ? "border-africhess-gold text-africhess-gold" : "border-white/15"
            }`}
          >
            {t(`bots.filter.${f}`)}
          </button>
        ))}
      </div>

      {featured.length > 0 && filter === "all" && !q && (
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold mb-3">{t("bots.featuredLegends")}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {featured.map((b) => (
              <Link
                key={b.slug}
                href={user ? `/play?mode=blitz&bot=${b.slug}` : "/login"}
                className="glass-card p-3 min-w-[140px] snap-start flex flex-col items-center gap-2 hover:ring-1 hover:ring-africhess-gold/50 transition"
              >
                <span className="relative w-16 h-16 rounded-xl overflow-hidden ring-2 ring-emerald-400/50">
                  <Image
                    src={getAiAvatarSrc(b.avatar_id)}
                    alt={label(b)}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </span>
                <span className="text-xs font-semibold text-center line-clamp-2">{label(b)}</span>
                <span className="text-[10px] text-africhess-gold font-mono">{b.elo}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {loading && <p className="opacity-60">{t("common.loading")}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots.map((b) => (
          <div key={b.slug} className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-africhess-gold shrink-0">
                <Image
                  src={getAiAvatarSrc(b.avatar_id)}
                  alt={label(b)}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{label(b)}</h3>
                <p className="text-xs text-africhess-gold font-mono">{b.elo} ELO</p>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
              {(b.is_legend ?? b.elo >= 2400) && (
                <span className="text-[10px] uppercase tracking-wide text-emerald-400 border border-emerald-400/40 px-2 py-0.5 rounded">
                  {t("bots.legend")}
                </span>
              )}
              {b.is_premium && (
                <span className="text-[10px] uppercase tracking-wide text-africhess-gold border border-africhess-gold/40 px-2 py-0.5 rounded">
                  {t("bots.premium")}
                </span>
              )}
              </div>
            </div>
            <p className="text-xs opacity-60 line-clamp-2">{desc(b)}</p>
            <p className="text-[10px] opacity-45">
              {b.personality} · {b.opening_style} · {b.country}
            </p>
            {user ? (
              <Link
                href={`/play?mode=blitz&bot=${b.slug}`}
                className="mt-auto text-center py-2 rounded-lg african-gradient text-white text-sm font-medium"
              >
                {t("bots.challenge")}
              </Link>
            ) : (
              <Link href="/login" className="mt-auto text-center text-sm text-africhess-gold hover:underline">
                {t("bots.loginToPlay")}
              </Link>
            )}
          </div>
        ))}
      </div>

      {!loading && bots.length === 0 && !error && (
        <p className="opacity-60 text-center py-12">{t("bots.empty")}</p>
      )}
    </div>
  );
}
