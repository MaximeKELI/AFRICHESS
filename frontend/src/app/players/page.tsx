"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ratingsApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { UserSearchBar } from "@/components/social/UserSearchBar";
import { useAuthStore } from "@/store/auth";
import { displayCountry } from "@/lib/countries";
import { countryFlag } from "@/lib/worldCountries";
import clsx from "clsx";

interface Entry {
  user: { username: string; display_name: string; country: string; title?: string };
  elo: number;
  rating_display?: string;
  games_count: number;
}

const MODES = ["bullet", "blitz", "rapid", "classical"] as const;

export default function PlayersPage() {
  const { t, locale } = useTranslation();
  const { user } = useAuthStore();
  const [scope, setScope] = useState<"global" | "african">("global");
  const [mode, setMode] = useState<string>("blitz");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher =
      scope === "global" ? ratingsApi.globalLeaderboard : ratingsApi.africanLeaderboard;
    fetcher(mode)
      .then(({ data }) => {
        setEntries(data.results || data);
        setError(null);
      })
      .catch((err) => {
        setEntries([]);
        setError(formatApiError(err, t("community.error.load")));
      })
      .finally(() => setLoading(false));
  }, [scope, mode, t]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/community" className="text-sm text-africhess-gold hover:underline mb-2 inline-block">
        ← {t("nav.community")}
      </Link>
      <h1 className="font-display text-3xl font-bold mb-2">{t("players.title")}</h1>
      <p className="opacity-70 mb-6">{t("players.subtitle")}</p>

      {user ? (
        <div className="mb-8 max-w-md">
          <p className="text-sm opacity-60 mb-2">{t("players.search")}</p>
          <UserSearchBar />
        </div>
      ) : (
        <p className="mb-8 text-sm opacity-70">
          <Link href="/login" className="text-africhess-gold hover:underline">
            {t("nav.login")}
          </Link>{" "}
          {t("players.searchLogin")}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["global", "players.scope.global"],
            ["african", "players.scope.african"],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScope(id)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm transition-colors",
              scope === id
                ? "bg-africhess-gold/20 text-africhess-gold font-medium"
                : "border border-white/20 hover:bg-white/10"
            )}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm capitalize transition-colors",
              mode === m
                ? "african-gradient text-white font-medium"
                : "border border-white/20 hover:bg-white/10"
            )}
          >
            {t(`play.mode.${m}`)}
          </button>
        ))}
        <Link
          href="/leaderboard"
          className="px-3 py-1.5 rounded-lg text-sm border border-white/20 hover:bg-white/10 ml-auto"
        >
          {t("players.leaderboard")}
        </Link>
      </div>

      {error && <InlineAlert className="mb-4">{error}</InlineAlert>}
      {loading && <p className="text-sm opacity-60 mb-4">{t("common.loading")}</p>}

      <h2 className="text-lg font-semibold mb-4 text-africhess-gold">
        {scope === "global" ? t("players.list.global") : t("players.list.african")}
      </h2>
      <div className="space-y-2">
        {entries.length > 0 ? (
          entries.map((e, i) => (
            <Link
              key={e.user.username}
              href={`/profile/${e.user.username}`}
              className="glass-card px-4 py-3 flex items-center gap-3 hover:ring-2 ring-africhess-gold/30"
            >
              <span className="w-8 text-sm opacity-50 tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">
                  {e.user.title ? `${e.user.title} ` : ""}
                  {e.user.display_name || e.user.username}
                </p>
                <p className="text-xs opacity-60">
                  {e.user.country
                    ? `${countryFlag(e.user.country)} ${displayCountry(e.user.country, locale)}`
                    : "—"}
                </p>
              </div>
              <span className="font-mono text-africhess-gold tabular-nums">
                {e.rating_display ?? e.elo}
              </span>
            </Link>
          ))
        ) : (
          !loading && <p className="opacity-60">{t("players.empty")}</p>
        )}
      </div>
    </div>
  );
}
