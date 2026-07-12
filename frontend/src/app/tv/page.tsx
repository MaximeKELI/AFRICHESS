"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { LiveEvalBar } from "@/components/chess/LiveEvalBar";
import { EvalGraph } from "@/components/chess/EvalGraph";
import { formatEvalDisplay, moveClassSymbol } from "@/lib/coachReview";
import { MOVE_CLASS_CHART_COLORS } from "@/lib/moveClassVisuals";
import { useTranslation } from "@/hooks/useTranslation";
import { useVisibilityInterval } from "@/hooks/useVisibilityInterval";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  {
    ssr: false,
    loading: () => <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />,
  }
);

interface TvMoveAnalysis {
  san?: string;
  class?: string;
  uci?: string;
  from?: string;
  to?: string;
  played_by_white?: boolean;
  cp_loss?: number;
  eval?: number;
  eval_before?: number;
  win_chance_white?: number;
  win_chance_black?: number;
}

interface TvAnalysis {
  eval?: number;
  win_chance_white?: number;
  win_chance_black?: number;
  curve?: Array<{
    eval?: number;
    eval_before?: number;
    class?: string;
    san?: string;
  }>;
  last_move?: TvMoveAnalysis | null;
  moves?: TvMoveAnalysis[];
}

interface TvGame {
  id: string;
  fen?: string;
  mode?: string;
  white_player?: { username: string; display_name?: string };
  black_player?: { username: string; display_name?: string };
  white_elo?: number;
  black_elo?: number;
  is_tv_exhibition?: boolean;
  move_count?: number;
  tv_analysis?: TvAnalysis | null;
}

const CHANNELS = ["best", "bullet", "blitz", "rapid", "classical"] as const;

function classLabelKey(moveClass: string): string {
  const known = [
    "brilliant",
    "great",
    "best",
    "book",
    "good",
    "inaccuracy",
    "mistake",
    "blunder",
  ];
  if (known.includes(moveClass)) return `chess.review.class.${moveClass}`;
  return "chess.review.class.good";
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
  const [selectedCurveIdx, setSelectedCurveIdx] = useState<number | null>(null);

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

  // Poll plus fréquent pour suivre les coups IA + courbe
  useVisibilityInterval(load, 4000);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setSelectedCurveIdx(null);
  }, [current?.id]);

  const secondsLeft = nextAt != null ? Math.max(0, nextAt - nowTs) : null;

  const playerLabel = (g: TvGame) => {
    const w = g.white_player?.display_name || g.white_player?.username || "?";
    const b = g.black_player?.display_name || g.black_player?.username || "?";
    const welo = g.white_elo ? ` (${g.white_elo})` : "";
    const belo = g.black_elo ? ` (${g.black_elo})` : "";
    return `${w}${welo} vs ${b}${belo}`;
  };

  const analysis = current?.tv_analysis;
  const lastMove = analysis?.last_move;
  const curve = analysis?.curve ?? [];
  const evalScore = analysis?.eval ?? null;
  const winW = analysis?.win_chance_white ?? 50;
  const winB = analysis?.win_chance_black ?? 50;

  const moveClassBadge = useMemo(() => {
    if (!lastMove?.to || !lastMove.class) return null;
    return { square: lastMove.to, moveClass: lastMove.class };
  }, [lastMove]);

  const lastMoveSquares = useMemo(() => {
    if (!lastMove?.from || !lastMove?.to) return null;
    return { from: lastMove.from, to: lastMove.to };
  }, [lastMove]);

  const turn: "w" | "b" =
    current?.fen?.includes(" b ") ? "b" : "w";

  const recentMoves = (analysis?.moves ?? []).slice(-12).reverse();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
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
              <p className="text-xs opacity-60 capitalize">
                {current.mode}
                {current.is_tv_exhibition && (
                  <span className="ml-2 text-africhess-gold normal-case">
                    · {t("tv.exhibition")} · {t("tv.masterStrength")}
                  </span>
                )}
              </p>
            </div>
            {secondsLeft != null && (
              <span className="text-xs text-africhess-gold">
                {t("tv.nextIn", { seconds: secondsLeft, total: rotationSeconds })}
              </span>
            )}
          </div>

          {(analysis || current.is_tv_exhibition) && (
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="opacity-70">{t("tv.winChance")}</span>
                <span className="font-mono tabular-nums">
                  <span className="text-white">{winW.toFixed(1)}%</span>
                  <span className="opacity-40 mx-2">/</span>
                  <span className="text-neutral-400">{winB.toFixed(1)}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex border border-white/10">
                <div
                  className="h-full bg-white/90 transition-all duration-500"
                  style={{ width: `${winW}%` }}
                />
                <div className="h-full bg-neutral-800 flex-1" />
              </div>
              <LiveEvalBar evaluation={evalScore} turn={turn} />
              {lastMove?.san && lastMove.class && (
                <div
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10"
                  style={{
                    borderColor: `${MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399"}55`,
                    background: `${MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399"}18`,
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-black text-xs"
                    style={{
                      borderColor: MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399",
                      color: MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399",
                    }}
                  >
                    {moveClassSymbol(lastMove.class)}
                  </span>
                  <div>
                    <p className="font-medium">
                      {lastMove.san}{" "}
                      <span className="opacity-80">
                        — {t(classLabelKey(lastMove.class))}
                      </span>
                    </p>
                    <p className="text-xs opacity-50">
                      {t("tv.evalNow")}: {formatEvalDisplay(evalScore)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] gap-4 items-start">
            <div className="max-w-md mx-auto w-full">
              <ChessBoard
                fen={current.fen || "start"}
                disabled
                lastMove={lastMoveSquares}
                moveClassBadge={moveClassBadge}
              />
            </div>
            <div className="space-y-4 min-w-0">
              {curve.length > 0 && (
                <EvalGraph
                  points={curve.map((p) => ({
                    eval: typeof p.eval === "number" ? p.eval : 0,
                    eval_before: p.eval_before,
                    class: p.class,
                    san: p.san,
                  }))}
                  selectedIndex={selectedCurveIdx}
                  onSelect={setSelectedCurveIdx}
                  height={120}
                />
              )}
              {recentMoves.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-africhess-gold/90 mb-2">
                    {t("tv.moveNature")}
                  </p>
                  <ul className="space-y-1 max-h-48 overflow-y-auto text-sm">
                    {recentMoves.map((m, i) => {
                      const cls = m.class || "good";
                      const color = MOVE_CLASS_CHART_COLORS[cls] ?? "#34d399";
                      return (
                        <li
                          key={`${m.uci}-${i}`}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-black/20"
                        >
                          <span className="font-mono">
                            <span
                              className="inline-block w-5 text-center font-black mr-1"
                              style={{ color }}
                            >
                              {moveClassSymbol(cls)}
                            </span>
                            {m.san}
                          </span>
                          <span className="text-xs opacity-70 truncate" style={{ color }}>
                            {t(classLabelKey(cls))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
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
        <p className="opacity-60 mb-8 text-sm">{t("tv.empty")}</p>
      )}

      {queue.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("tv.upNext")}</h2>
          <ul className="space-y-2">
            {queue.map((g) => {
              const a = g.tv_analysis;
              const last = a?.last_move;
              return (
                <li
                  key={g.id}
                  className="glass-card p-3 flex flex-wrap justify-between items-center gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <span>{playerLabel(g)}</span>
                    {g.is_tv_exhibition && (
                      <span className="ml-2 text-xs text-africhess-gold">
                        {t("tv.exhibition")}
                      </span>
                    )}
                    {a && (
                      <p className="text-xs opacity-50 mt-0.5">
                        {a.win_chance_white?.toFixed(0)}% / {a.win_chance_black?.toFixed(0)}%
                        {last?.san && last.class
                          ? ` · ${last.san} ${moveClassSymbol(last.class)}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <Link href={`/watch/${g.id}`} className="text-africhess-gold hover:underline">
                    {t("live.watch")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
