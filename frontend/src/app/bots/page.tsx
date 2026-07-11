"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, Check, Trophy } from "lucide-react";
import { gamesApi } from "@/lib/api";
import { getAiAvatarSrc } from "@/lib/avatars";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

interface LadderBot {
  slug: string;
  name: string;
  name_en: string;
  country: string;
  elo: number;
  tier: string;
  avatar_id: string;
  personality: string;
  opening_style: string;
  description: string;
  description_en: string;
  is_premium: boolean;
  is_legend?: boolean;
  unlocked: boolean;
  beaten: boolean;
  locked_reason: "premium" | "progress" | null;
}

interface LadderTier {
  id: string;
  label: string;
  description: string;
  min_elo: number;
  max_elo: number;
  preset_elo: number;
  bots: LadderBot[];
  bots_count: number;
  beaten_count: number;
}

interface LadderData {
  max_beaten_elo: number;
  unlock_ceiling: number;
  tiers: LadderTier[];
  total_bots: number;
  total_beaten: number;
}

export default function BotsPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuthStore();
  const [ladder, setLadder] = useState<LadderData | null>(null);
  const [activeTier, setActiveTier] = useState<string>("beginner");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    gamesApi
      .botLadder(locale.startsWith("fr") ? "fr" : "en")
      .then(({ data }) => {
        setLadder(data);
        const firstWithUnlocked = data.tiers.find((tier) =>
          tier.bots.some((b) => b.unlocked && !b.beaten)
        );
        const firstPartial = data.tiers.find((tier) => tier.bots.some((b) => b.unlocked));
        setActiveTier(firstWithUnlocked?.id ?? firstPartial?.id ?? data.tiers[0]?.id ?? "beginner");
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("bots.error.load"))))
      .finally(() => setLoading(false));
  }, [locale, t, user?.id]);

  const tier = useMemo(
    () => ladder?.tiers.find((x) => x.id === activeTier) ?? null,
    [ladder, activeTier]
  );

  const label = (b: LadderBot) => (locale === "fr" ? b.name : b.name_en || b.name);
  const desc = (b: LadderBot) => (locale === "fr" ? b.description : b.description_en || b.description);

  const challengeHref = (b: LadderBot) => {
    if (!user) return "/login";
    if (!b.unlocked) {
      if (b.locked_reason === "premium") return "/premium";
      return "#";
    }
    return `/play?mode=blitz&bot=${b.slug}`;
  };

  const challengeLabel = (b: LadderBot) => {
    if (!user) return t("bots.loginToPlay");
    if (!b.unlocked) {
      if (b.locked_reason === "premium") return t("premium.subscribe");
      return t("bots.locked");
    }
    if (b.beaten) return t("bots.rematch");
    return t("bots.challenge");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">{t("bots.title")}</h1>
          <p className="opacity-70">{t("bots.ladder.subtitle")}</p>
        </div>
        {ladder && (
          <div className="text-sm opacity-80 space-y-1 text-right">
            <p className="flex items-center gap-2 justify-end">
              <Trophy size={16} className="text-africhess-gold" />
              {t("bots.ladder.progress", {
                beaten: ladder.total_beaten,
                total: ladder.total_bots,
              })}
            </p>
            <p className="text-xs opacity-60">
              {t("bots.ladder.ceiling", { elo: ladder.unlock_ceiling })}
            </p>
          </div>
        )}
      </div>

      <p className="text-sm opacity-60 mb-6">{t("bots.ladder.hint")}</p>

      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}
      {loading && <LoadingState />}

      {ladder && (
        <>
          <div className="flex flex-wrap gap-2 mb-8">
            {ladder.tiers.map((tr) => {
              const unlockedCount = tr.bots.filter((b) => b.unlocked).length;
              return (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => setActiveTier(tr.id)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    activeTier === tr.id
                      ? "african-gradient text-white border-transparent"
                      : unlockedCount > 0
                        ? "border-white/20 hover:border-africhess-gold/50"
                        : "border-white/10 opacity-50"
                  }`}
                >
                  <span className="font-medium">{tr.label}</span>
                  <span className="block text-[10px] opacity-70">
                    {tr.min_elo}–{tr.max_elo > 9000 ? "3200+" : tr.max_elo} · {tr.beaten_count}/{tr.bots_count}
                  </span>
                </button>
              );
            })}
          </div>

          {tier && (
            <section className="mb-10">
              <h2 className="font-display text-xl font-bold mb-1">{tier.label}</h2>
              <p className="text-sm opacity-60 mb-4">{tier.description}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tier.bots.map((b) => {
                  const href = challengeHref(b);
                  const locked = !b.unlocked;
                  return (
                    <article
                      key={b.slug}
                      className={`relative rounded-xl border p-4 transition-colors ${
                        b.beaten
                          ? "border-africhess-green/40 bg-africhess-green/5"
                          : locked
                            ? "border-white/10 opacity-70"
                            : "border-white/15 hover:border-africhess-gold/40"
                      }`}
                    >
                      {locked && (
                        <div className="absolute top-3 right-3 text-africhess-gold/80">
                          <Lock size={16} />
                        </div>
                      )}
                      {b.beaten && (
                        <div className="absolute top-3 right-3 text-africhess-green">
                          <Check size={16} />
                        </div>
                      )}
                      <div className="flex gap-3 mb-3">
                        <span className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-africhess-gold/30 shrink-0">
                          <Image
                            src={getAiAvatarSrc(b.avatar_id)}
                            alt=""
                            fill
                            className={`object-cover ${locked ? "grayscale" : ""}`}
                            sizes="56px"
                          />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{label(b)}</h3>
                          <p className="text-africhess-gold font-mono text-sm">{b.elo} Elo</p>
                          <p className="text-[11px] opacity-50 truncate">
                            {b.personality} · {b.opening_style}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs opacity-60 line-clamp-2 mb-3">{desc(b)}</p>
                      {locked ? (
                        <p className="text-xs text-africhess-gold/80">
                          {b.locked_reason === "premium"
                            ? t("bots.lockedPremium")
                            : t("bots.lockedProgress")}
                        </p>
                      ) : (
                        <Link
                          href={href}
                          className="inline-flex w-full justify-center py-2 rounded-lg african-gradient text-white text-sm font-medium"
                        >
                          {challengeLabel(b)}
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <div className="rounded-xl border border-white/10 p-4 text-sm opacity-70">
            <p className="font-medium text-africhess-gold mb-1">{t("bots.ladder.howTitle")}</p>
            <p>{t("bots.ladder.howBody")}</p>
            <Link href="/leaderboard" className="inline-block mt-3 text-africhess-gold hover:underline">
              {t("bots.ladder.seeRatings")} →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
