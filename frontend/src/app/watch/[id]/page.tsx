"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CapturedBoardStack } from "@/components/chess/CapturedBoardStack";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { LiveEvalBar } from "@/components/chess/LiveEvalBar";
import { EvalGraph } from "@/components/chess/EvalGraph";
import { useAuthStore } from "@/store/auth";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useGameWebSocket, type WsGamePayload } from "@/hooks/useGameWebSocket";
import { buildGameDisplayFromFen, buildGameDisplayFromMoves, type ApiMove } from "@/lib/chessDisplay";
import { mergeApiMoves } from "@/lib/gameMerge";
import { formatEvalDisplay, moveClassSymbol } from "@/lib/coachReview";
import { MOVE_CLASS_CHART_COLORS } from "@/lib/moveClassVisuals";
import type { TvAnalysis } from "@/components/tv/TvExhibitionCard";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useVisibilityInterval } from "@/hooks/useVisibilityInterval";

function wsMovesToApi(
  raw: WsGamePayload["game"]["moves"] | WsGamePayload["game"]["new_moves"]
): ApiMove[] {
  return (raw ?? []).map((m, i) => ({
    uci: m.uci,
    san: m.san,
    played_by_white: m.played_by_white,
    move_number: ("move_number" in m && m.move_number) || i + 1,
  }));
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

export default function WatchGamePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [fen, setFen] = useState("start");
  const [moves, setMoves] = useState<ApiMove[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [isExhibition, setIsExhibition] = useState(false);
  const [tvAnalysis, setTvAnalysis] = useState<TvAnalysis | null>(null);
  const { user } = useAuthStore();

  const handleUpdate = useCallback((payload: WsGamePayload) => {
    const g = payload.game;
    setFen(g.fen);
    setStatus(g.status ?? "");
    setMoves((prev) => {
      if (g.delta && g.new_moves?.length) {
        return mergeApiMoves(prev, wsMovesToApi(g.new_moves));
      }
      if (g.moves?.length) {
        return wsMovesToApi(g.moves);
      }
      return prev;
    });
  }, []);

  const { wsError } = useGameWebSocket(id ?? null, Boolean(id), handleUpdate);

  const loadGame = useCallback(() => {
    if (!id) return;
    gamesApi
      .get(id)
      .then(({ data }) => {
        setFen(data.fen);
        setMoves(data.moves ?? []);
        setStatus(data.status);
        setIsExhibition(Boolean(data.is_tv_exhibition));
        setTvAnalysis((data.tv_analysis as TvAnalysis) ?? null);
        setError(null);
      })
      .catch((err) => {
        setError(formatApiError(err, t("watch.error")));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  useEffect(() => {
    setLoading(true);
    loadGame();
  }, [loadGame]);

  useVisibilityInterval(loadGame, 3000, isExhibition);

  const display = useMemo(() => {
    if (moves.length) return buildGameDisplayFromMoves("start", moves);
    return buildGameDisplayFromFen(fen);
  }, [fen, moves]);

  useEffect(() => {
    if (isExhibition && tvAnalysis?.eval != null) {
      setEvaluation(tvAnalysis.eval);
      setEvalLoading(false);
      return;
    }
    if (!user || !display.fen || display.fen === "start") return;
    const cleanFen = display.fen.replace(/\[.*?\]/g, "");
    let cancelled = false;
    setEvalLoading(true);
    gamesApi
      .engineEval(cleanFen)
      .then(({ data }) => {
        if (!cancelled) setEvaluation(data.evaluation);
      })
      .catch(() => {
        if (!cancelled) setEvaluation(null);
      })
      .finally(() => {
        if (!cancelled) setEvalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, display.fen, isExhibition, tvAnalysis?.eval]);

  const lastMove = tvAnalysis?.last_move;
  const curve = tvAnalysis?.curve ?? [];
  const winW = tvAnalysis?.win_chance_white ?? 50;
  const winB = tvAnalysis?.win_chance_black ?? 50;

  const moveClassBadge = useMemo(() => {
    if (!lastMove?.to || !lastMove.class) return null;
    return { square: lastMove.to, moveClass: lastMove.class };
  }, [lastMove]);

  if (loading) {
    return <p className="p-8 text-center opacity-60">{t("watch.loading")}</p>;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <InlineAlert className="mb-4">{error}</InlineAlert>
        <Link href="/tv" className="text-sm text-africhess-gold hover:underline">
          {t("watch.backLiveError")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/tv" className="text-sm text-africhess-gold mb-4 inline-block">
        {t("watch.backLive")}
      </Link>
      <h1 className="font-display text-2xl font-bold mb-4">{t("watch.title")}</h1>
      <p className="text-xs opacity-60 mb-4">{t("watch.readonly")}</p>
      {wsError && (
        <InlineAlert variant="info" className="mb-4 text-xs">
          {wsError}
        </InlineAlert>
      )}

      {(isExhibition || user) && (
        <div className="mb-4 space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
          {isExhibition && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="opacity-70">{t("tv.winChance")}</span>
                <span className="font-mono tabular-nums">
                  <span className="text-white font-semibold">{winW.toFixed(1)}%</span>
                  <span className="opacity-40 mx-1.5">/</span>
                  <span className="text-neutral-400">{winB.toFixed(1)}%</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden flex border border-white/10">
                <div
                  className="h-full bg-white/90 transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(98, winW))}%` }}
                />
                <div className="h-full bg-neutral-800 flex-1" />
              </div>
            </>
          )}
          <LiveEvalBar
            evaluation={evaluation}
            turn={display.turn}
            loading={evalLoading}
          />
          {isExhibition && lastMove?.san && lastMove.class && (
            <div
              className="flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg border"
              style={{
                borderColor: `${MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399"}66`,
                background: `${MOVE_CLASS_CHART_COLORS[lastMove.class] ?? "#34d399"}22`,
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
                  {lastMove.san} — {t(classLabelKey(lastMove.class))}
                </p>
                <p className="text-xs opacity-50">
                  {t("tv.evalNow")}: {formatEvalDisplay(evaluation)}
                </p>
              </div>
            </div>
          )}
          {isExhibition && curve.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-africhess-gold/90 px-1 mb-1">
                {t("tv.evalCurve")}
              </p>
              <EvalGraph
                points={curve.map((p) => ({
                  eval: typeof p.eval === "number" ? p.eval : 0,
                  eval_before: p.eval_before,
                  class: p.class,
                  san: p.san,
                }))}
                height={120}
                framed={false}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(200px,240px)] gap-4 lg:gap-6 items-start">
        <div className="w-full min-w-0">
          <CapturedBoardStack captured={display.captured} orientation="white">
            <ChessBoard
              fen={display.fen}
              orientation="white"
              disabled
              playerColor="w"
              lastMove={display.lastMove}
              moveClassBadge={moveClassBadge}
            />
          </CapturedBoardStack>
        </div>
        <GameSidePanel
          moves={display.moveRows}
          isCheck={display.isCheck}
          turn={display.turn}
        />
      </div>
      {status && (
        <p className="mt-4 text-sm opacity-60 capitalize">{status}</p>
      )}
    </div>
  );
}
