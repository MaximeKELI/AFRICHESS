"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { useTranslation } from "@/hooks/useTranslation";
import { useVisibilityInterval } from "@/hooks/useVisibilityInterval";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  {
    ssr: false,
    loading: () => <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />,
  }
);

interface TvGame {
  id: string;
  fen?: string;
  mode?: string;
  white_player?: { username: string; display_name?: string };
  black_player?: { username: string; display_name?: string };
  white_elo?: number;
  black_elo?: number;
}

const CHANNELS = ["best", "bullet", "blitz", "rapid", "classical"] as const;

export default function TvPage() {
  const { t } = useTranslation();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("best");
  const [current, setCurrent] = useState<TvGame | null>(null);
  const [queue, setQueue] = useState<TvGame[]>([]);
  const [rotationSeconds, setRotationSeconds] = useState(30);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    gamesApi
      .liveTv(channel)
      .then(({ data }) => {
        setCurrent((data.current as TvGame) ?? null);
        setQueue((data.queue as TvGame[]) ?? []);
        setRotationSeconds(data.rotation_seconds ?? 30);
        setNextAt(data.next_rotation_at ?? null);
        setError(null);
      })
      .catch((err) => setError(formatApiError(err, t("tv.error.load"))));
  }, [channel, t]);

  useVisibilityInterval(load, 30000);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft =
    nextAt != null ? Math.max(0, nextAt - nowTs) : null;

  const playerLabel = (g: TvGame) => {
    const w = g.white_player?.display_name || g.white_player?.username || "?";
    const b = g.black_player?.display_name || g.black_player?.username || "?";
    const welo = g.white_elo ? ` (${g.white_elo})` : "";
    const belo = g.black_elo ? ` (${g.black_elo})` : "";
    return `${w}${welo} vs ${b}${belo}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("tv.title")}</h1>
          <p className="text-sm opacity-60 mt-1">{t("tv.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/live" className="text-africhess-gold hover:underline">
            {t("tv.allLive")} →
          </Link>
          <Link href="/streamers" className="text-africhess-gold hover:underline">
            {t("nav.streamers")} →
          </Link>
          <Link href="/broadcasts" className="text-africhess-gold hover:underline">
            {t("nav.broadcasts")} →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setChannel(ch)}
            className={`px-3 py-1 rounded-full text-sm border capitalize ${
              channel === ch ? "border-africhess-gold bg-africhess-gold/10" : "border-white/15"
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {current ? (
        <section className="glass-card p-4 mb-8">
          <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
            <div>
              <p className="font-medium">{playerLabel(current)}</p>
              <p className="text-xs opacity-60 capitalize">{current.mode}</p>
            </div>
            {secondsLeft != null && (
              <span className="text-xs text-africhess-gold">
                {t("tv.nextIn", { seconds: secondsLeft, total: rotationSeconds })}
              </span>
            )}
          </div>
          <div className="max-w-md mx-auto">
            <ChessBoard fen={current.fen || "start"} disabled />
          </div>
          <div className="mt-4 text-center">
            <Link
              href={`/watch/${current.id}`}
              className="text-africhess-gold hover:underline text-sm"
            >
              {t("live.watch")}
            </Link>
          </div>
        </section>
      ) : (
        <p className="opacity-60 mb-8">{t("live.empty")}</p>
      )}

      {queue.length > 1 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("tv.upNext")}</h2>
          <ul className="space-y-2">
            {queue.slice(0, 8).map((g) => (
              <li key={g.id} className="glass-card p-3 flex justify-between items-center text-sm">
                <span>{playerLabel(g)}</span>
                <Link href={`/watch/${g.id}`} className="text-africhess-gold hover:underline">
                  {t("live.watch")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
