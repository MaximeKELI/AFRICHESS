"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { formatApiError } from "@/lib/errors";
import { InlineAlert } from "@/components/ui/InlineAlert";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function ClassroomPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<{
    code: string;
    title: string;
    current_fen: string;
    host: string;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [boardKey, setBoardKey] = useState(0);

  const isHost = Boolean(user && room && room.host === user.username);

  const join = async () => {
    setError(null);
    try {
      const { data } = await learningApi.getClassroom(code.trim().toUpperCase());
      setRoom(data);
      setBoardKey((k) => k + 1);
    } catch (err) {
      setError(formatApiError(err, t("classroom.error.join")));
    }
  };

  const create = async () => {
    setError(null);
    try {
      const { data } = await learningApi.createClassroom(title);
      setRoom(data);
      setCode(data.code);
      setBoardKey((k) => k + 1);
    } catch (err) {
      setError(formatApiError(err, t("classroom.error.create")));
    }
  };

  // Élèves + hôte : synchroniser le FEN
  useEffect(() => {
    if (!room?.code) return;
    const id = setInterval(() => {
      learningApi
        .getClassroom(room.code)
        .then(({ data }) => {
          setRoom((prev) => {
            if (!prev) return data;
            if (prev.current_fen !== data.current_fen) {
              setBoardKey((k) => k + 1);
            }
            return data;
          });
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(id);
  }, [room?.code]);

  const pushFen = useCallback(
    async (fen: string) => {
      if (!room || !isHost) return;
      setRoom({ ...room, current_fen: fen });
      try {
        await learningApi.updateClassroom(room.code, { fen });
      } catch (err) {
        setError(formatApiError(err, t("classroom.error.update")));
      }
    },
    [room, isHost, t]
  );

  const onHostMove = (uci: string) => {
    if (!isHost || !room) return;
    try {
      const fen = room.current_fen === "startpos" ? START_FEN : room.current_fen;
      const g = new Chess(fen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      g.move({ from, to, promotion });
      void pushFen(g.fen());
    } catch {
      /* coup invalide côté client */
    }
  };

  const resetBoard = () => {
    if (!isHost) return;
    setBoardKey((k) => k + 1);
    void pushFen(START_FEN);
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Link href="/login" className="text-africhess-gold underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("classroom.title")}</h1>
      <p className="text-sm opacity-60">{t("classroom.subtitle")}</p>
      {error && (
        <InlineAlert onDismiss={() => setError(null)}>{error}</InlineAlert>
      )}

      {!room ? (
        <div className="glass-card p-4 space-y-4">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("classroom.code")}
              className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm uppercase"
            />
            <button type="button" onClick={join} className="px-4 py-2 border rounded-lg text-sm">
              {t("classroom.join")}
            </button>
          </div>
          <div className="flex gap-2 border-t border-white/10 pt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("classroom.titleLabel")}
              className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
            <button
              type="button"
              onClick={create}
              className="px-4 py-2 african-gradient text-white rounded-lg text-sm"
            >
              {t("classroom.create")}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              {room.title || t("classroom.session")} ·{" "}
              <span className="font-mono text-africhess-gold">{room.code}</span>
            </p>
            {isHost && (
              <button
                type="button"
                onClick={resetBoard}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:border-africhess-gold"
              >
                {t("classroom.reset")}
              </button>
            )}
          </div>
          <ChessBoard
            key={boardKey}
            fen={room.current_fen === "startpos" ? START_FEN : room.current_fen}
            disabled={!isHost}
            orientation="white"
            playSoundOnFenChange={!isHost}
            onMove={isHost ? onHostMove : undefined}
          />
          <p className="text-xs opacity-50">
            {t("classroom.host")}: {room.host}
            {!isHost && ` · ${t("classroom.spectatorHint")}`}
            {isHost && ` · ${t("classroom.hostHint")}`}
          </p>
        </div>
      )}
    </div>
  );
}
