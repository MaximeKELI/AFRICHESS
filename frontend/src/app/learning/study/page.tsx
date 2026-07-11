"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

export default function StudyPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [due, setDue] = useState<{
    line_id: number;
    name: string;
    color?: string;
    moves_uci: string[];
  } | null>(null);
  const [played, setPlayed] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [board, setBoard] = useState(() => new Chess());

  const [newName, setNewName] = useState("");
  const [newMoves, setNewMoves] = useState("");
  const [createMsg, setCreateMsg] = useState("");

  const loadDue = () => {
    learningApi
      .studyReviewDue()
      .then(({ data }) => {
        if (data?.line_id) {
          setDue(data);
          setPlayed([]);
          setBoard(new Chess());
        } else {
          setDue(null);
        }
      })
      .catch(() => setDue(null));
  };

  useEffect(() => {
    if (user) loadDue();
  }, [user]);

  const submitMoves = async (next: string[]) => {
    if (!due) return;
    setPlayed(next);
    const { data } = await learningApi.submitStudyReview(due.line_id, next);
    if (data.completed) {
      setMsg(t("study.complete"));
      setPlayed([]);
      setBoard(new Chess());
      loadDue();
    } else if (!data.correct) {
      setMsg(t("study.wrong"));
      setPlayed([]);
      setBoard(new Chess());
    } else {
      setMsg("");
    }
  };

  const onDrop = (from: string, to: string) => {
    if (!due) return false;
    const g = new Chess(board.fen());
    try {
      const m = g.move({ from, to, promotion: "q" });
      if (!m) return false;
      const uci = `${from}${to}${m.promotion || ""}`;
      setBoard(g);
      void submitMoves([...played, uci]);
      return true;
    } catch {
      return false;
    }
  };

  const createLine = async () => {
    const moves = newMoves
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!newName.trim() || moves.length === 0) return;
    setCreateMsg("");
    try {
      await learningApi.createStudyLine({
        name: newName.trim(),
        moves_uci: moves,
        color: "white",
      });
      setCreateMsg(t("study.created"));
      setNewName("");
      setNewMoves("");
      loadDue();
    } catch {
      setCreateMsg(t("study.createError"));
    }
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
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.learn")}
      </Link>
      <h1 className="font-display text-2xl font-bold">{t("study.title")}</h1>
      <p className="text-sm opacity-60">{t("study.subtitle")}</p>

      <div className="glass-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">{t("study.createTitle")}</h2>
        <input
          className="w-full px-3 py-2 rounded border bg-transparent text-sm"
          placeholder={t("study.createName")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 rounded border bg-transparent text-sm font-mono"
          placeholder={t("study.createMoves")}
          value={newMoves}
          onChange={(e) => setNewMoves(e.target.value)}
        />
        <button
          type="button"
          onClick={createLine}
          className="african-gradient px-3 py-1.5 rounded-lg text-sm"
        >
          {t("study.create")}
        </button>
        {createMsg && <p className="text-sm text-africhess-green">{createMsg}</p>}
      </div>

      {!due ? (
        <p className="text-sm opacity-60">{t("study.noDue")}</p>
      ) : (
        <div className="glass-card p-4 space-y-3">
          <h2 className="font-semibold">{due.name}</h2>
          <p className="text-xs opacity-60">
            {t("study.progress", { n: played.length, total: due.moves_uci.length })}
          </p>
          <div className="aspect-square max-w-sm mx-auto rounded-xl overflow-hidden border border-white/20">
            <Chessboard
              position={board.fen()}
              boardWidth={360}
              boardOrientation={due.color === "black" ? "black" : "white"}
              onPieceDrop={onDrop}
              customDarkSquareStyle={squareBase.dark as Record<string, string>}
              customLightSquareStyle={squareBase.light as Record<string, string>}
            />
          </div>
          {played.length > 0 && (
            <p className="text-xs font-mono opacity-60">{played.join(" ")}</p>
          )}
        </div>
      )}
      {msg && <p className="text-sm text-africhess-green">{msg}</p>}
    </div>
  );
}
