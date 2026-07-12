"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { GameReview } from "@/components/chess/GameReview";
import { learningApi } from "@/lib/learningApi";
import { pgnToGameAnalysis } from "@/lib/pgnAnalysisAdapter";
import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";
import { formatApiError } from "@/lib/errors";

export default function PasteGamePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [pgn, setPgn] = useState("");
  const [previewFen, setPreviewFen] = useState<string | null>(null);
  const [previewMoves, setPreviewMoves] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<GameAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = () => {
    setError(null);
    setAnalysis(null);
    try {
      const g = new Chess();
      g.loadPgn(pgn.trim());
      setPreviewFen(g.fen());
      setPreviewMoves(g.history());
    } catch {
      setPreviewFen(null);
      setPreviewMoves([]);
      setError(t("paste.invalidPgn"));
    }
  };

  const runAnalysis = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await learningApi.analyzePgn(pgn);
      setAnalysis(pgnToGameAnalysis(data));
    } catch (err) {
      setError(formatApiError(err, t("learning.analyze.error")));
    } finally {
      setLoading(false);
    }
  };

  if (analysis) {
    return (
      <GameReview
        gameId=""
        playerIsWhite
        orientation="white"
        initialAnalysis={analysis}
        staticMode
        layout="page"
        onClose={() => setAnalysis(null)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/tools" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.group.tools")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("paste.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("paste.subtitle")}</p>
      </div>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        rows={8}
        className="w-full glass-card p-4 text-sm font-mono bg-transparent border border-white/10 rounded-lg"
        placeholder={t("paste.placeholder")}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loadPreview}
          disabled={!pgn.trim()}
          className="px-4 py-2 rounded-lg border hover:bg-white/10 text-sm disabled:opacity-50"
        >
          {t("paste.preview")}
        </button>
        {user ? (
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading || !pgn.trim()}
            className="px-4 py-2 rounded-lg african-gradient text-white text-sm disabled:opacity-50"
          >
            {loading ? t("chess.review.analyzing") : t("paste.analyze")}
          </button>
        ) : (
          <p className="text-sm opacity-70 self-center">
            <Link href="/login" className="text-africhess-gold hover:underline">
              {t("nav.login")}
            </Link>{" "}
            {t("paste.loginAnalyze")}
          </p>
        )}
        <Link href="/analysis" className="px-4 py-2 rounded-lg border hover:bg-white/10 text-sm">
          {t("nav.analysisBoard")}
        </Link>
      </div>

      {error && <p className="text-sm text-africhess-terracotta">{error}</p>}

      {previewFen && (
        <div className="space-y-3">
          <div className="aspect-square max-w-md mx-auto rounded-xl overflow-hidden border border-white/20">
            <Chessboard
              position={previewFen}
              boardWidth={400}
              arePiecesDraggable={false}
              customDarkSquareStyle={squareBase.dark as Record<string, string>}
              customLightSquareStyle={squareBase.light as Record<string, string>}
            />
          </div>
          {previewMoves.length > 0 && (
            <p className="text-sm font-mono opacity-80 text-center">{previewMoves.join(" ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
