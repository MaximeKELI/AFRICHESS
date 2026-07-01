"use client";

import { useCallback, useEffect, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { learningApi } from "@/lib/learningApi";
import { useTranslation } from "@/hooks/useTranslation";

interface Drill {
  id: string;
  fen: string;
  goal_key: string;
  solution: string[];
  theme: string;
  rating: number;
}

export default function EndgameTrainerPage() {
  const { t } = useTranslation();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [idx, setIdx] = useState(0);
  const [fen, setFen] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    learningApi.endgameDrills().then(({ data }) => {
      const list = Array.isArray(data) ? (data as Drill[]) : [];
      setDrills(list);
      if (list[0]) setFen(list[0].fen);
    });
  }, []);

  const drill = drills[idx];

  const onMove = useCallback(
    (uci: string) => {
      if (!drill) return;
      const chess = new Chess(fen);
      try {
        chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
        });
        setFen(chess.fen());
        const ok = drill.solution.some(
          (s) => s.toLowerCase() === uci.toLowerCase() || s.toLowerCase() === uci.slice(0, 4).toLowerCase()
        );
        setFeedback(ok ? t("endgame.correct") : t("endgame.tryAgain"));
      } catch {
        setFeedback(t("endgame.illegal"));
      }
    },
    [fen, drill, t]
  );

  const next = () => {
    if (!drills.length) return;
    const n = (idx + 1) % drills.length;
    setIdx(n);
    setFen(drills[n].fen);
    setFeedback(null);
  };

  if (!drill) {
    return <p className="p-8 text-center opacity-60">{t("common.loading")}</p>;
  }

  const orientation = drill.fen.includes(" w ") ? "white" : "black";

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("endgame.title")}</h1>
      <p className="text-sm opacity-70">{t("endgame.subtitle")}</p>
      <p className="text-xs opacity-50">
        {idx + 1}/{drills.length} · {drill.theme} · {drill.rating}
      </p>
      <p className="text-sm font-medium text-africhess-gold">{t(drill.goal_key)}</p>
      <ChessBoard fen={fen} onMove={onMove} orientation={orientation} />
      {feedback && <p className="text-sm">{feedback}</p>}
      <button type="button" onClick={next} className="px-4 py-2 text-sm rounded-lg border border-white/20">
        {t("endgame.next")}
      </button>
    </div>
  );
}
