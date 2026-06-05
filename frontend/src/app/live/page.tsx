"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";

interface LiveGame {
  id: string;
  white_player?: { username: string; display_name?: string };
  black_player?: { username: string; display_name?: string };
  mode: string;
  move_count?: number;
}

export default function LiveGamesPage() {
  const { t } = useTranslation();
  const [channel, setChannel] = useState("");
  const [games, setGames] = useState<LiveGame[]>([]);
  const [featured, setFeatured] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      gamesApi
        .live()
        .then(({ data }) => {
          if (Array.isArray(data)) {
            setGames(data);
            setFeatured([]);
            setChannel("");
          } else {
            setChannel(data.channel ?? "");
            setGames(data.games ?? []);
            setFeatured(data.featured ?? []);
          }
          setError(null);
        })
        .catch((err) => {
          setGames([]);
          setFeatured([]);
          setError(formatApiError(err, t("live.error.load")));
        })
        .finally(() => setLoading(false));
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [t]);

  const renderGame = (g: LiveGame, highlight = false) => (
    <li
      key={g.id}
      className={`glass-card p-4 flex justify-between items-center ${
        highlight ? "ring-1 ring-africhess-gold/40" : ""
      }`}
    >
      <div>
        <span className="font-medium">
          {(g.white_player?.display_name || g.white_player?.username) ?? "?"} vs{" "}
          {(g.black_player?.display_name || g.black_player?.username) ?? "?"}
        </span>
        <span className="text-xs opacity-60 ml-2 capitalize">{g.mode}</span>
        {g.move_count != null && (
          <span className="text-xs opacity-45 ml-2">
            · {g.move_count} {t("live.moves")}
          </span>
        )}
      </div>
      <Link href={`/watch/${g.id}`} className="text-sm text-africhess-gold hover:underline">
        {t("live.watch")}
      </Link>
    </li>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-1">{t("live.title")}</h1>
      {channel && <p className="text-sm text-africhess-gold mb-6">{channel}</p>}

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}
      {loading && <p className="text-sm opacity-60 mb-4">{t("common.loading")}</p>}

      {featured.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-africhess-gold">{t("live.featured")}</h2>
          <ul className="space-y-3">{featured.map((g) => renderGame(g, true))}</ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">{t("live.allGames")}</h2>
        {!loading && !error && games.length === 0 ? (
          <p className="opacity-60">{t("live.empty")}</p>
        ) : (
          <ul className="space-y-3">{games.map((g) => renderGame(g))}</ul>
        )}
      </section>
    </div>
  );
}
