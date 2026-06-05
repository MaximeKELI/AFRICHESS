"use client";

import { useState } from "react";
import Link from "next/link";
import { learningApi } from "@/lib/learningApi";
import { useAuthStore } from "@/store/auth";
import { useTranslation } from "@/hooks/useTranslation";

interface MoveAnalysis {
  san: string;
  classification: string;
  classification_fr: string;
  explanation_fr: string;
  centipawn_loss: number;
}

interface AnalysisResult {
  moves: MoveAnalysis[];
  summary: {
    blunders: number;
    mistakes: number;
    inaccuracies: number;
    accuracy_estimate: number;
  };
  summary_fr: string;
}

export default function AnalyzePage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [pgn, setPgn] = useState("1. e4 e5 2. Nf3 Nc6 3. Bb5");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await learningApi.analyzePgn(pgn);
      setResult(data);
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
          ← Apprentissage
        </Link>
        <p>{t("learning.analyze.login")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/learning" className="text-sm text-africhess-gold hover:underline mb-4 inline-block">
        ← Apprentissage
      </Link>
      <h1 className="font-display text-3xl font-bold mb-2">Analyse de partie</h1>
      <p className="opacity-70 mb-6 text-sm">
        Stockfish détecte gaffes, fautes et meilleurs coups — explications en français.
      </p>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        rows={6}
        className="w-full glass-card p-4 text-sm font-mono bg-transparent border border-white/10 rounded-lg mb-4"
        placeholder="Collez votre PGN ici…"
      />
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="px-6 py-2 rounded-lg african-gradient text-white disabled:opacity-50"
      >
        {loading ? "Analyse en cours…" : "Analyser"}
      </button>
      {error && <p className="mt-4 text-africhess-terracotta">{error}</p>}

      {result && (
        <div className="mt-8 space-y-4">
          <div className="glass-card p-5">
            <p className="font-medium">{result.summary_fr}</p>
            <p className="text-sm opacity-70 mt-2">
              Précision estimée : {result.summary.accuracy_estimate}% ·{" "}
              {result.summary.blunders} gaffe(s), {result.summary.mistakes} faute(s),{" "}
              {result.summary.inaccuracies} imprécision(s)
            </p>
          </div>
          <ul className="space-y-2 max-h-[400px] overflow-y-auto">
            {result.moves.map((m, i) => (
              <li
                key={i}
                className={`text-sm p-3 rounded-lg border ${
                  m.classification === "blunder"
                    ? "border-africhess-terracotta/50 bg-africhess-terracotta/10"
                    : m.classification === "mistake"
                      ? "border-orange-500/30 bg-orange-500/5"
                      : "border-white/10 bg-white/5"
                }`}
              >
                <span className="font-mono font-bold mr-2">{m.san}</span>
                <span className="capitalize text-africhess-gold">{m.classification_fr}</span>
                <p className="opacity-80 mt-1">{m.explanation_fr}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
