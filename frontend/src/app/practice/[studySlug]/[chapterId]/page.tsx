"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { learningApi } from "@/lib/learningApi";
import { formatApiError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { LoadingState } from "@/components/ui/LoadingState";

interface ChapterData {
  id: number;
  title: string;
  fen: string;
  solution_uci: string[];
  goal: string;
  goal_moves: number | null;
  study: { slug: string; title: string };
}

export default function PracticeChapterPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const params = useParams();
  const studySlug = String(params.studySlug || "");
  const chapterId = Number(params.chapterId);

  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [fen, setFen] = useState("");
  const [played, setPlayed] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardKey, setBoardKey] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(chapterId)) return;
    learningApi
      .practiceChapter(chapterId)
      .then(({ data }) => {
        setChapter(data);
        setFen(data.fen);
        setPlayed([]);
        setDone(false);
        setFeedback(null);
        setBoardKey((k) => k + 1);
      })
      .catch((err) => setError(formatApiError(err, t("practice.empty"))))
      .finally(() => setLoading(false));
  }, [chapterId, t]);

  const goalLabel = () => {
    if (!chapter) return "";
    if (chapter.goal === "mateIn" && chapter.goal_moves) {
      return t("practice.goal.mateIn", { n: chapter.goal_moves });
    }
    if (chapter.goal === "mate") return t("practice.goal.mate");
    return t("practice.goal.generic");
  };

  const markComplete = useCallback(
    async (moves: string[]) => {
      setDone(true);
      setFeedback(t("practice.complete"));
      if (user) {
        try {
          await learningApi.practiceComplete(chapterId, moves.length);
        } catch {
          /* progression optionnelle */
        }
      }
    },
    [chapterId, user, t]
  );

  const onMove = useCallback(
    (uci: string) => {
      if (!chapter || done) return;
      const board = new Chess(fen);
      try {
        board.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: (uci[4] as "q" | "r" | "b" | "n") || undefined,
        });
      } catch {
        setFeedback(t("learn.basics.illegal"));
        return;
      }

      const next = [...played, uci];
      const solution = chapter.solution_uci || [];

      // Auto-reply opponent move if solution continues
      let finalFen = board.fen();
      let finalMoves = next;
      if (
        solution.length > next.length &&
        solution[next.length - 1]?.slice(0, 4) === uci.slice(0, 4)
      ) {
        const reply = solution[next.length];
        if (reply) {
          try {
            board.move({
              from: reply.slice(0, 2),
              to: reply.slice(2, 4),
              promotion: (reply[4] as "q" | "r" | "b" | "n") || undefined,
            });
            finalMoves = [...next, reply];
            finalFen = board.fen();
          } catch {
            /* ignore auto reply fail */
          }
        }
      }

      setFen(finalFen);
      setPlayed(finalMoves);

      const prefixOk =
        solution.length > 0 &&
        solution.slice(0, next.length).every((s, i) => s.slice(0, 4) === next[i].slice(0, 4));

      if (chapter.goal === "mate" || chapter.goal === "mateIn") {
        if (board.isCheckmate()) {
          void markComplete(finalMoves);
          return;
        }
      }

      if (solution.length && prefixOk && next.length >= solution.length) {
        void markComplete(finalMoves);
        return;
      }

      if (solution.length && !prefixOk) {
        setFeedback(t("practice.tryAgain"));
        setFen(chapter.fen);
        setPlayed([]);
        setBoardKey((k) => k + 1);
        return;
      }

      setFeedback(null);
    },
    [chapter, done, fen, played, markComplete, t]
  );

  const reset = () => {
    if (!chapter) return;
    setFen(chapter.fen);
    setPlayed([]);
    setDone(false);
    setFeedback(null);
    setBoardKey((k) => k + 1);
  };

  if (loading) return <LoadingState />;
  if (error || !chapter) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <InlineAlert>{error ?? t("practice.empty")}</InlineAlert>
      </div>
    );
  }

  const orientation = chapter.fen.includes(" b ") ? "black" : "white";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Link
        href={`/practice/${studySlug || chapter.study.slug}`}
        className="text-sm text-africhess-gold hover:underline"
      >
        ← {chapter.study.title}
      </Link>
      <h1 className="font-display text-2xl font-bold">{chapter.title}</h1>
      <p className="text-sm text-africhess-gold">{goalLabel()}</p>
      {!user && <p className="text-xs opacity-50">{t("practice.login")}</p>}
      <ChessBoard key={boardKey} fen={fen} onMove={onMove} orientation={orientation} disabled={done} />
      {feedback && <p className="text-sm font-medium">{feedback}</p>}
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 text-sm rounded-lg border border-white/20"
      >
        {t("learn.basics.reset")}
      </button>
    </div>
  );
}
