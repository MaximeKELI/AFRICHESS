"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { UserSearchBar } from "@/components/social/UserSearchBar";

interface GameRow {
  id: string;
  mode: string;
  status: string;
  result?: string;
  white_player?: { username: string; display_name?: string } | null;
  black_player?: { username: string; display_name?: string } | null;
  ended_at?: string;
  created_at?: string;
}

export default function GamesSearchPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [opponent, setOpponent] = useState("");
  const [mode, setMode] = useState("");
  const [result, setResult] = useState("");
  const [games, setGames] = useState<GameRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = () => {
    if (!user) return;
    setLoading(true);
    gamesApi
      .list({
        opponent: opponent.trim() || undefined,
        mode: mode || undefined,
        result: result || undefined,
      })
      .then(({ data }) => {
        setGames(Array.isArray(data) ? data : data.results ?? []);
        setError(null);
      })
      .catch((err) => {
        setGames([]);
        setError(formatApiError(err, t("search.error")));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) search();
    // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Link href="/tools" className="text-sm text-africhess-gold mb-4 inline-block">
          ← {t("nav.group.tools")}
        </Link>
        <p>
          <Link href="/login" className="text-africhess-gold hover:underline">
            {t("nav.login")}
          </Link>{" "}
          {t("search.login")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Link href="/tools" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.group.tools")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("search.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("search.subtitle")}</p>
      </div>

      <section className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">{t("search.players")}</h2>
        <UserSearchBar />
      </section>

      <section className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">{t("search.games")}</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder={t("search.opponent")}
            className="px-3 py-2 rounded-lg border bg-transparent text-sm"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-transparent text-sm"
          >
            <option value="">{t("search.anyMode")}</option>
            {["bullet", "blitz", "rapid", "classical", "ai", "correspondence"].map((m) => (
              <option key={m} value={m}>
                {t(`modes.${m}`) !== `modes.${m}` ? t(`modes.${m}`) : m}
              </option>
            ))}
          </select>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-transparent text-sm"
          >
            <option value="">{t("search.anyResult")}</option>
            <option value="win">{t("search.win")}</option>
            <option value="loss">{t("search.loss")}</option>
            <option value="draw">{t("search.draw")}</option>
          </select>
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
        >
          {loading ? t("common.loading") : t("search.submit")}
        </button>
      </section>

      {error && <InlineAlert>{error}</InlineAlert>}

      <ul className="space-y-2">
        {games.map((g) => {
          const white = g.white_player?.display_name || g.white_player?.username || "?";
          const black = g.black_player?.display_name || g.black_player?.username || "?";
          return (
            <li key={g.id}>
              <Link
                href={`/watch/${g.id}`}
                className="glass-card px-4 py-3 flex flex-wrap items-center gap-3 hover:ring-2 ring-africhess-gold/20"
              >
                <span className="font-medium flex-1 min-w-0 truncate">
                  {white} vs {black}
                </span>
                <span className="text-xs opacity-50 uppercase">{g.mode}</span>
                <span className="text-xs opacity-50">{g.result || g.status}</span>
              </Link>
            </li>
          );
        })}
        {!loading && games.length === 0 && (
          <p className="opacity-60">{t("search.empty")}</p>
        )}
      </ul>
    </div>
  );
}
