"use client";

import { useState } from "react";
import Link from "next/link";
import { GameReview } from "@/components/chess/GameReview";
import { learningApi } from "@/lib/learningApi";
import { pgnToGameAnalysis } from "@/lib/pgnAnalysisAdapter";
import type { GameAnalysisData } from "@/lib/gameAnalysis";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

export default function AnalyzePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [pgn, setPgn] = useState("1. e4 e5 2. Nf3 Nc6 3. Bb5");
  const [analysis, setAnalysis] = useState<GameAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await learningApi.analyzePgn(pgn);
      setAnalysis(pgnToGameAnalysis(data));
    } catch {
      setError(t("learning.analyze.error"));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Link href="/learning" className="text-sm text-africhess-gold mb-4 inline-block">
          ← {t("learning.back")}
        </Link>
        <p>{t("learning.analyze.login")}</p>
      </div>
    );
  }

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline mb-4 inline-block">
        ← {t("learning.back")}
      </Link>
      <h1 className="font-display text-3xl font-bold mb-2">{t("learning.analyzeBoard")}</h1>
      <p className="opacity-70 mb-6 text-sm">{t("chess.analysis.hint")}</p>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        rows={6}
        className="w-full glass-card p-4 text-sm font-mono bg-transparent border border-white/10 rounded-lg mb-4"
        placeholder="PGN…"
      />
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="px-6 py-2 rounded-lg african-gradient text-white disabled:opacity-50"
      >
        {loading ? t("chess.review.analyzing") : t("chess.analysis.run")}
      </button>
      {error && <p className="mt-4 text-africhess-terracotta">{error}</p>}
    </div>
  );
}
