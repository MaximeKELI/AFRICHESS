"use client";

import { useCallback, useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { useTranslation } from "@/hooks/useTranslation";

const DRILLS = [
  {
    id: "kp1",
    fen: "8/8/8/8/8/4K3/8/4k3 w - - 0 1",
    goal: "endgame.kp.opposition",
    solution: ["e3"],
  },
  {
    id: "kp2",
    fen: "8/8/8/3k4/8/3K4/3P4/8 w - - 0 1",
    goal: "endgame.kp.push",
    solution: ["d4"],
  },
  {
    id: "rook1",
    fen: "6k1/8/8/8/8/8/6PP/6K1 w - - 0 1",
    goal: "endgame.rook.lift",
    solution: ["g3"],
  },
] as const;

export default function EndgameTrainerPage() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const drill = DRILLS[idx];
  const [fen, setFen] = useState<string>(drill.fen);
  const [feedback, setFeedback] = useState<string | null>(null);

  const onMove = useCallback(
    (uci: string) => {
      const chess = new Chess(fen);
      try {
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        setFen(chess.fen());
        if ((drill.solution as readonly string[]).includes(uci)) {
          setFeedback(t("endgame.correct"));
        } else {
          setFeedback(t("endgame.tryAgain"));
        }
      } catch {
        setFeedback(t("endgame.illegal"));
      }
    },
    [fen, drill, t]
  );

  const next = () => {
    const n = (idx + 1) % DRILLS.length;
    setIdx(n);
    setFen(DRILLS[n].fen);
    setFeedback(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("endgame.title")}</h1>
      <p className="text-sm opacity-70">{t("endgame.subtitle")}</p>
      <p className="text-sm font-medium text-africhess-gold">{t(drill.goal)}</p>
      <ChessBoard fen={fen} onMove={onMove} orientation="white" />
      {feedback && <p className="text-sm">{feedback}</p>}
      <button type="button" onClick={next} className="px-4 py-2 text-sm rounded-lg border border-white/20">
        {t("endgame.next")}
      </button>
    </div>
  );
}
