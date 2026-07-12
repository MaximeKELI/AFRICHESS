"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { LiveEvalBar } from "@/components/chess/LiveEvalBar";
import { EvalGraph } from "@/components/chess/EvalGraph";
import { formatEvalDisplay, moveClassSymbol } from "@/lib/coachReview";
import { MOVE_CLASS_CHART_COLORS } from "@/lib/moveClassVisuals";
import { useTranslation } from "@/hooks/useTranslation";

const ChessBoard = dynamic(
  () => import("@/components/chess/ChessBoard").then((m) => m.ChessBoard),
  {
    ssr: false,
    loading: () => <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />,
  }
);

export interface TvMoveAnalysis {
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

export interface TvAnalysis {
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
  head_to_head?: {
    white_wins?: number;
    black_wins?: number;
    draws?: number;
    played?: number;
  };
}

export interface TvGame {
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

function playerLabel(g: TvGame): string {
  const w = g.white_player?.display_name || g.white_player?.username || "?";
  const b = g.black_player?.display_name || g.black_player?.username || "?";
  const welo = g.white_elo ? ` (${g.white_elo})` : "";
  const belo = g.black_elo ? ` (${g.black_elo})` : "";
  return `${w}${welo} vs ${b}${belo}`;
}

interface TvExhibitionCardProps {
  game: TvGame;
  featured?: boolean;
  onSelect?: () => void;
}

/** Carte TV : échiquier + % gain + barre eval + courbe + nature des coups. */
export function TvExhibitionCard({ game, featured = false, onSelect }: TvExhibitionCardProps) {
  const { t } = useTranslation();
  const [selectedCurveIdx, setSelectedCurveIdx] = useState<number | null>(null);

  const analysis = game.tv_analysis;
  const lastMove = analysis?.last_move;
  const curve = analysis?.curve ?? [];
  const evalScore = analysis?.eval ?? null;
  const winW = analysis?.win_chance_white ?? 50;
  const winB = analysis?.win_chance_black ?? 50;
  const recentMoves = (analysis?.moves ?? []).slice(-10).reverse();
  const turn: "w" | "b" = game.fen?.includes(" b ") ? "b" : "w";

  const moveClassBadge = useMemo(() => {
    if (!lastMove?.to || !lastMove.class) return null;
    return { square: lastMove.to, moveClass: lastMove.class };
  }, [lastMove]);

  const lastMoveSquares = useMemo(() => {
    if (!lastMove?.from || !lastMove?.to) return null;
    return { from: lastMove.from, to: lastMove.to };
  }, [lastMove]);

  const hasStats = Boolean(analysis && (curve.length > 0 || lastMove?.san));

  return (
    <article
      className={`glass-card p-4 ${featured ? "ring-1 ring-africhess-gold/35" : ""} ${
        onSelect ? "cursor-pointer hover:ring-1 hover:ring-africhess-gold/25 transition" : ""
      }`}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-sm sm:text-base truncate">{playerLabel(game)}</p>
          <p className="text-xs opacity-60 capitalize">
            {game.mode}
            {game.is_tv_exhibition && (
              <span className="ml-2 text-africhess-gold normal-case">
                · {t("tv.exhibition")} · {t("tv.masterStrength")}
              </span>
            )}
            {game.move_count != null && (
              <span className="ml-2 opacity-50 normal-case">
                · {game.move_count} {t("live.moves")}
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/watch/${game.id}`}
          className="text-africhess-gold hover:underline text-xs shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {t("live.watch")}
        </Link>
      </div>

      {/* Stats toujours visibles (contraste fort clair/sombre) */}
      <div className="mb-3 space-y-2 rounded-xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/40 p-3 shadow-sm">
        {analysis?.head_to_head && (
          <div className="rounded-lg border border-africhess-gold/25 bg-africhess-gold/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-africhess-gold/90 mb-1.5">
              {t("tv.h2hTitle")}
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate text-xs sm:text-sm mb-1">
                  {game.white_player?.display_name || game.white_player?.username || "?"}
                </p>
                <p className="font-mono tabular-nums text-xs space-x-1">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {analysis.head_to_head.white_wins ?? 0}
                    {t("tv.h2hWinsShort")}
                  </span>
                  <span className="opacity-40">·</span>
                  <span>
                    {analysis.head_to_head.draws ?? 0}
                    {t("tv.h2hDrawsShort")}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="text-red-600 dark:text-red-400">
                    {analysis.head_to_head.black_wins ?? 0}
                    {t("tv.h2hLossesShort")}
                  </span>
                </p>
              </div>
              <div className="text-center opacity-40 text-[10px] pt-1 shrink-0">vs</div>
              <div className="min-w-0 text-right">
                <p className="font-medium truncate text-xs sm:text-sm mb-1">
                  {game.black_player?.display_name || game.black_player?.username || "?"}
                </p>
                <p className="font-mono tabular-nums text-xs space-x-1">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {analysis.head_to_head.black_wins ?? 0}
                    {t("tv.h2hWinsShort")}
                  </span>
                  <span className="opacity-40">·</span>
                  <span>
                    {analysis.head_to_head.draws ?? 0}
                    {t("tv.h2hDrawsShort")}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="text-red-600 dark:text-red-400">
                    {analysis.head_to_head.white_wins ?? 0}
                    {t("tv.h2hLossesShort")}
                  </span>
                </p>
              </div>
            </div>
            <p className="text-[10px] opacity-50 mt-1.5 text-center">
              {t("tv.h2hLegend")} · {t("tv.h2hPlayed", { count: analysis.head_to_head.played ?? 0 })}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="opacity-70">{t("tv.winChance")}</span>
          <span className="font-mono tabular-nums text-sm">
            <span className="font-semibold">{winW.toFixed(1)}%</span>
            <span className="opacity-40 mx-1.5">/</span>
            <span className="opacity-70">{winB.toFixed(1)}%</span>
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex border border-black/10 dark:border-white/10">
          <div
            className="h-full bg-neutral-900 dark:bg-white/90 transition-all duration-500"
            style={{ width: `${Math.max(2, Math.min(98, winW))}%` }}
          />
          <div className="h-full bg-neutral-300 dark:bg-neutral-800 flex-1" />
        </div>
        <LiveEvalBar evaluation={evalScore} turn={turn} />
        {lastMove?.san && lastMove.class ? (
          <div
            className="flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg border"
            style={{
              borderColor: `${MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399"}66`,
              background: `${MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399"}22`,
            }}
          >
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 font-black text-xs shrink-0"
              style={{
                borderColor: MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399",
                color: MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399",
              }}
            >
              {moveClassSymbol(lastMove.class)}
            </span>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {lastMove.san} — {t(classLabelKey(lastMove.class))}
              </p>
              <p className="text-xs opacity-60">
                {t("tv.evalNow")}: {formatEvalDisplay(evalScore)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs opacity-60">{t("tv.statsPending")}</p>
        )}
      </div>

      <div
        className={`grid gap-3 items-start ${
          featured
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]"
            : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        <div className="w-full max-w-sm mx-auto">
          <ChessBoard
            fen={game.fen || "start"}
            disabled
            lastMove={lastMoveSquares}
            moveClassBadge={moveClassBadge}
          />
        </div>

        <div className="space-y-3 min-w-0">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-africhess-gold/90 px-1 mb-1">
              {t("tv.evalCurve")}
            </p>
            {curve.length > 0 ? (
              <EvalGraph
                points={curve.map((p) => ({
                  eval: typeof p.eval === "number" ? p.eval : 0,
                  eval_before: p.eval_before,
                  class: p.class,
                  san: p.san,
                }))}
                selectedIndex={selectedCurveIdx}
                onSelect={setSelectedCurveIdx}
                height={featured ? 130 : 100}
                framed={false}
              />
            ) : (
              <p className="text-xs opacity-50 text-center py-6">{t("tv.statsPending")}</p>
            )}
          </div>

          {hasStats && recentMoves.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-africhess-gold/90 mb-1.5">
                {t("tv.moveNature")}
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
                {recentMoves.map((m, i) => {
                  const cls = m.class || "good";
                  const color = MOVE_CLASS_CHART_COLORS[cls] ?? "#34d399";
                  return (
                    <li
                      key={`${m.uci}-${i}`}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-black/25"
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
                      <span className="text-xs opacity-80 truncate" style={{ color }}>
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
    </article>
  );
}
