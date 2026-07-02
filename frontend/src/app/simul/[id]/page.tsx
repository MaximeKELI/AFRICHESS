"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { gamesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { useSimulWebSocket, type SimulBoardUpdate } from "@/hooks/useSimulWebSocket";

interface SimulBoard {
  board_number: number;
  game_id: string;
  opponent: string;
  status: string;
  result: string;
  fen?: string;
}

interface SimulDetail {
  id: number;
  title: string;
  host: string;
  host_id: number;
  status: string;
  max_boards: number;
  boards: SimulBoard[];
}

export default function SimulHostPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const sessionId = Number(params.id);
  const [detail, setDetail] = useState<SimulDetail | null>(null);

  const load = useCallback(() => {
    gamesApi.simulDetail(sessionId).then(({ data }) => setDetail(data as SimulDetail)).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const mergeBoard = useCallback((update: SimulBoardUpdate) => {
    setDetail((prev) => {
      if (!prev) return prev;
      const boards = [...prev.boards];
      const idx = boards.findIndex((b) => b.game_id === update.game_id);
      const row: SimulBoard = {
        board_number: update.board_number,
        game_id: update.game_id,
        opponent: update.opponent,
        status: update.status,
        result: update.result || "",
        fen: update.fen,
      };
      if (idx >= 0) boards[idx] = { ...boards[idx], ...row };
      else boards.push(row);
      boards.sort((a, b) => a.board_number - b.board_number);
      return { ...prev, boards };
    });
  }, []);

  useSimulWebSocket(sessionId, Boolean(user && detail), mergeBoard, (payload) => {
    setDetail((prev) => (prev ? { ...prev, status: payload.status } : prev));
  });

  if (!detail) {
    return <p className="p-8 text-center opacity-60">{t("common.loading")}</p>;
  }

  const isHost = user?.id === detail.host_id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/simul" className="text-sm text-africhess-gold hover:underline">
        {t("simul.back")}
      </Link>
      <h1 className="font-display text-3xl font-bold">{detail.title}</h1>
      <p className="text-sm opacity-60">
        {detail.host} · {detail.boards.length}/{detail.max_boards} · {detail.status}
      </p>

      {isHost && (
        <p className="text-sm text-africhess-green">{t("simul.hostHint")}</p>
      )}

      <div className="grid gap-3">
        {detail.boards.map((b) => (
          <Link
            key={b.game_id}
            href={`/play?game=${b.game_id}`}
            className="glass-card p-4 flex justify-between items-center gap-4 hover:border-africhess-gold/40 transition"
          >
            <div className="flex items-center gap-4 min-w-0">
              {b.fen && (
                <div className="shrink-0 w-16">
                  <MiniBoard fen={b.fen} size={64} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {t("simul.board", { n: b.board_number })} — {b.opponent}
                </p>
                <p className="text-xs opacity-50">
                  {b.status}
                  {b.result ? ` · ${b.result}` : ""}
                </p>
              </div>
            </div>
            <span className="text-sm text-africhess-gold shrink-0">{t("simul.openBoard")}</span>
          </Link>
        ))}
        {detail.boards.length === 0 && (
          <p className="text-sm opacity-50 text-center py-8">{t("simul.waitingPlayers")}</p>
        )}
      </div>
    </div>
  );
}
