"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { TvExhibitionCard, type TvGame } from "@/components/tv/TvExhibitionCard";
import { useTranslation } from "@/hooks/useTranslation";
import { useVisibilityInterval } from "@/hooks/useVisibilityInterval";

const CHANNELS = ["best", "bullet", "blitz", "rapid", "classical"] as const;

function dedupeGames(games: TvGame[]): TvGame[] {
  const seen = new Set<string>();
  const out: TvGame[] = [];
  for (const g of games) {
    if (!g?.id || seen.has(g.id)) continue;
    seen.add(g.id);
    out.push(g);
  }
  return out;
}

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

  useVisibilityInterval(load, 3000);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = nextAt != null ? Math.max(0, nextAt - nowTs) : null;

  const allGames = useMemo(() => {
    const merged = dedupeGames([...(current ? [current] : []), ...queue]);
    // Exhibitions d'abord (stats riches), puis humains
    return merged.sort((a, b) => {
      const ae = a.is_tv_exhibition ? 0 : 1;
      const be = b.is_tv_exhibition ? 0 : 1;
      if (ae !== be) return ae - be;
      return (b.move_count ?? 0) - (a.move_count ?? 0);
    });
  }, [current, queue]);

  const featuredId = current?.id ?? allGames[0]?.id;
  const featured = allGames.find((g) => g.id === featuredId) ?? null;
  const others = allGames.filter((g) => g.id !== featured?.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`px-3 py-1 rounded-full text-sm border capitalize ${
                channel === ch
                  ? "border-africhess-gold bg-africhess-gold/10"
                  : "border-white/15"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        {secondsLeft != null && featured && (
          <span className="text-xs text-africhess-gold ml-auto">
            {t("tv.nextIn", { seconds: secondsLeft, total: rotationSeconds })}
          </span>
        )}
      </div>

      {error && (
        <InlineAlert className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      {!featured && allGames.length === 0 ? (
        <p className="opacity-60 mb-8 text-sm">{t("tv.empty")}</p>
      ) : (
        <div className="space-y-6">
          {featured && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-africhess-gold/90 mb-3">
                {t("tv.nowPlaying")}
              </h2>
              <TvExhibitionCard game={featured} featured />
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider opacity-70 mb-3">
                {t("tv.allExhibitions")} ({others.length + (featured ? 1 : 0)})
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {others.map((g) => (
                  <TvExhibitionCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
