"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { gamesApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { useGameWebSocket, type WsGamePayload } from "@/hooks/useGameWebSocket";
import { buildGameDisplayFromFen, buildGameDisplayFromMoves, type ApiMove } from "@/lib/chessDisplay";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

function wsMovesToApi(
  raw: WsGamePayload["game"]["moves"]
): ApiMove[] {
  return (raw ?? []).map((m, i) => ({
    uci: m.uci,
    san: m.san,
    played_by_white: m.played_by_white,
    move_number: i + 1,
  }));
}

export default function WatchGamePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [fen, setFen] = useState("start");
  const [moves, setMoves] = useState<ApiMove[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = useCallback((payload: WsGamePayload) => {
    setFen(payload.game.fen);
    setMoves(wsMovesToApi(payload.game.moves));
    setStatus(payload.game.status ?? "");
  }, []);

  const { wsError } = useGameWebSocket(id ?? null, Boolean(id), handleUpdate);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    gamesApi
      .get(id)
      .then(({ data }) => {
        setFen(data.fen);
        setMoves(data.moves ?? []);
        setStatus(data.status);
      })
      .catch((err) => {
        setError(formatApiError(err, t("watch.error")));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  const display = useMemo(() => {
    if (moves.length) return buildGameDisplayFromMoves("start", moves);
    return buildGameDisplayFromFen(fen);
  }, [fen, moves]);

  if (loading) {
    return <p className="p-8 text-center opacity-60">{t("watch.loading")}</p>;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <InlineAlert className="mb-4">{error}</InlineAlert>
        <Link href="/live" className="text-sm text-africhess-gold hover:underline">
          {t("watch.backLiveError")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/live" className="text-sm text-africhess-gold mb-4 inline-block">
        {t("watch.backLive")}
      </Link>
      <h1 className="font-display text-2xl font-bold mb-4">{t("watch.title")}</h1>
      <p className="text-xs opacity-60 mb-4">{t("watch.readonly")}</p>
      {wsError && (
        <InlineAlert variant="info" className="mb-4 text-xs">
          {wsError}
        </InlineAlert>
      )}
      <div className="grid md:grid-cols-[1fr_220px] gap-6">
        <ChessBoard
          fen={display.fen}
          orientation="white"
          disabled
          playerColor="w"
          lastMove={display.lastMove}
        />
        <GameSidePanel
          moves={display.moveRows}
          captured={display.captured}
          orientation="white"
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
