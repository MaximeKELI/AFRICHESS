"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameReview } from "@/components/chess/GameReview";
import { gamesApi } from "@/lib/api";
import { parseAnalysisPayload } from "@/lib/gameAnalysis";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import { formatApiError } from "@/lib/errors";

interface GameReviewPageProps {
  params: { id: string };
}

export default function GameReviewPage({ params }: GameReviewPageProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerIsWhite, setPlayerIsWhite] = useState(true);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [result, setResult] = useState<string | undefined>();
  const [moveCount, setMoveCount] = useState<number | undefined>();
  const [initialAnalysis, setInitialAnalysis] = useState(
    () => null as ReturnType<typeof parseAnalysisPayload>
  );

  const handleAnalysisReady = useCallback((payload: { analysis?: unknown }) => {
    const parsed = parseAnalysisPayload(payload.analysis);
    if (parsed) setInitialAnalysis((prev) => prev ?? parsed);
  }, []);

  useGameWebSocket(
    params.id,
    Boolean(user),
    () => {},
    undefined,
    undefined,
    handleAnalysisReady
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    gamesApi
      .get(params.id)
      .then(({ data }) => {
        const isWhite = data.white_player?.id === user.id;
        const isBlack = data.black_player?.id === user.id;
        if (!isWhite && !isBlack) {
          setError(t("chess.review.notParticipant"));
          return;
        }
        setPlayerIsWhite(isWhite);
        setOrientation(isWhite ? "white" : "black");
        setResult(data.result);
        setMoveCount(data.move_count);
        setInitialAnalysis(parseAnalysisPayload(data.analysis));
      })
      .catch((err) => setError(formatApiError(err, t("chess.analysis.unavailable"))))
      .finally(() => setLoading(false));
  }, [params.id, user, t]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p>{t("learning.analyze.login")}</p>
        <Link href="/login" className="text-africhess-gold hover:underline">
          {t("app.login")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="p-12 text-center opacity-60">{t("common.loading")}</p>;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-africhess-terracotta">{error}</p>
        <Link href="/profile" className="text-africhess-gold hover:underline">
          {t("chess.review.backProfile")}
        </Link>
      </div>
    );
  }

  return (
    <GameReview
      gameId={params.id}
      playerIsWhite={playerIsWhite}
      orientation={orientation}
      initialAnalysis={initialAnalysis}
      moveCount={moveCount}
      result={result}
      layout="page"
      cacheFirst
      onClose={() => router.push("/profile")}
    />
  );
}
