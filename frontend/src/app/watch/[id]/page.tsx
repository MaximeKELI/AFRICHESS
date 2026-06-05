"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameSidePanel } from "@/components/chess/GameSidePanel";
import { gamesApi } from "@/lib/api";
import { useGameWebSocket, type WsGamePayload } from "@/hooks/useGameWebSocket";
import { buildGameDisplayFromFen, buildGameDisplayFromMoves, type ApiMove } from "@/lib/chessDisplay";
import Link from "next/link";

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
  const { id } = useParams<{ id: string }>();
  const [fen, setFen] = useState("start");
  const [moves, setMoves] = useState<ApiMove[]>([]);
  const [status, setStatus] = useState("");

  const handleUpdate = useCallback((payload: WsGamePayload) => {
    setFen(payload.game.fen);
    setMoves(wsMovesToApi(payload.game.moves));
    setStatus(payload.game.status ?? "");
  }, []);

  useGameWebSocket(id ?? null, Boolean(id), handleUpdate);

  useEffect(() => {
    if (!id) return;
    gamesApi.get(id).then(({ data }) => {
      setFen(data.fen);
      setMoves(data.moves ?? []);
      setStatus(data.status);
    });
  }, [id]);

  const display = useMemo(() => {
    if (moves.length) return buildGameDisplayFromMoves("start", moves);
    return buildGameDisplayFromFen(fen);
  }, [fen, moves]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/live" className="text-sm text-africhess-gold mb-4 inline-block">
        ← Parties en direct
      </Link>
      <h1 className="font-display text-2xl font-bold mb-4">Mode observateur</h1>
      <p className="text-xs opacity-60 mb-4">Lecture seule · WebSocket</p>
      <div className="grid md:grid-cols-[1fr_220px] gap-6">
        <ChessBoard fen={display.fen} disabled playerColor="w" lastMove={display.lastMove} />
        <GameSidePanel
          moves={display.moveRows}
          captured={display.captured}
          orientation="white"
          isCheck={display.isCheck}
          turn={display.turn}
        />
      </div>
      {status === "completed" && <p className="mt-4 text-africhess-gold">Partie terminée</p>}
    </div>
  );
}
