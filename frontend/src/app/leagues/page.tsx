"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ratingsApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/auth";

interface Standing {
  tier: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  games: number;
  user: { username: string; display_name?: string };
}

const TIERS = ["wood", "stone", "bronze", "silver", "gold", "platinum", "diamond", "legend"] as const;

export default function LeaguesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tier, setTier] = useState<string>("");
  const [seasonName, setSeasonName] = useState("");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [myStanding, setMyStanding] = useState<Standing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    ratingsApi
      .leagueStandings(tier || undefined)
      .then(({ data }) => {
        setSeasonName(data.season?.name ?? "");
        setStandings(data.standings ?? []);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("leagues.error.load"))))
      .finally(() => setLoading(false));
  }, [tier, t]);

  useEffect(() => {
    if (!user) return;
    ratingsApi.myLeague().then(({ data }) => setMyStanding(data)).catch(() => {});
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-2">{t("leagues.title")}</h1>
      <p className="opacity-70 mb-2">{t("leagues.subtitle")}</p>
      {seasonName && <p className="text-sm text-africhess-gold mb-6">{seasonName}</p>}

      {myStanding && (
        <div className="glass-card p-4 mb-6">
          <h2 className="font-semibold mb-2">{t("leagues.myStanding")}</h2>
          <p className="text-sm">
            {t(`leagues.tier.${myStanding.tier}`)} · {myStanding.points} {t("leagues.points")} ·{" "}
            {myStanding.wins}V {myStanding.draws}N {myStanding.losses}D
          </p>
          <p className="text-xs opacity-60 mt-1">{t("leagues.promotionHint")}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTier("")}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            !tier ? "border-africhess-gold text-africhess-gold" : "border-white/15"
          }`}
        >
          {t("leagues.allTiers")}
        </button>
        {TIERS.map((tir) => (
          <button
            key={tir}
            type="button"
            onClick={() => setTier(tir)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              tier === tir ? "border-africhess-gold text-africhess-gold" : "border-white/15"
            }`}
          >
            {t(`leagues.tier.${tir}`)}
          </button>
        ))}
      </div>

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {loading && <p className="opacity-60">{t("common.loading")}</p>}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left opacity-60">
              <th className="p-3">#</th>
              <th className="p-3">{t("leagues.player")}</th>
              <th className="p-3">{t("leagues.tierLabel")}</th>
              <th className="p-3">{t("leagues.points")}</th>
              <th className="p-3">W/D/L</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.user.username} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3 opacity-60">{i + 1}</td>
                <td className="p-3">
                  <Link href={`/profile/${s.user.username}`} className="hover:text-africhess-gold hover:underline">
                    {s.user.display_name || s.user.username}
                  </Link>
                </td>
                <td className="p-3">{t(`leagues.tier.${s.tier}`)}</td>
                <td className="p-3 font-mono text-africhess-gold">{s.points}</td>
                <td className="p-3 opacity-70">
                  {s.wins}/{s.draws}/{s.losses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && standings.length === 0 && (
          <p className="p-6 text-center opacity-60">{t("leagues.empty")}</p>
        )}
      </div>

      {!user && (
        <p className="mt-6 text-sm opacity-70 text-center">
          <Link href="/login" className="text-africhess-gold hover:underline">
            {t("leagues.loginHint")}
          </Link>
        </p>
      )}
    </div>
  );
}
