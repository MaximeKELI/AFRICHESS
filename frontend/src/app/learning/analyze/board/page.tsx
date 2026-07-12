"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { gamesApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function AnalyzeBoardInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [game, setGame] = useState(() => new Chess());
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [setupMode, setSetupMode] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [evalCp, setEvalCp] = useState<number | null>(null);
  const [moves, setMoves] = useState<string[]>([]);

  const fetchEval = async (fen: string) => {
    try {
      const { data } = await gamesApi.engineEval(fen);
      setEvalCp(data.evaluation ?? null);
    } catch {
      setEvalCp(null);
    }
  };

  const loadFen = useCallback((fen: string) => {
    try {
      setGame(new Chess(fen));
      setMoves([]);
      void fetchEval(fen);
    } catch {
      /* FEN invalide */
    }
  }, []);

  useEffect(() => {
    const fen = searchParams.get("fen");
    if (fen) loadFen(fen);
  }, [searchParams, loadFen]);

  const onDrop = (from: string, to: string) => {
    if (setupMode) return false;
    const g = new Chess(game.fen());
    try {
      const m = g.move({ from, to, promotion: "q" });
      if (!m) return false;
      setGame(g);
      setMoves((prev) => [...prev, m.san]);
      void fetchEval(g.fen());
      return true;
    } catch {
      return false;
    }
  };

  const onSquareClick = (square: string) => {
    if (!setupMode || !selectedPiece) return;
    const g = new Chess(game.fen());
    g.remove(square as Square);
    const color = selectedPiece[0] === "w" ? "w" : "b";
    const type = selectedPiece[1].toLowerCase() as "p" | "n" | "b" | "r" | "q" | "k";
    try {
      g.put({ type, color }, square as Square);
      setGame(g);
      void fetchEval(g.fen());
    } catch {
      /* placement invalide */
    }
  };

  const clearBoard = () => {
    setGame(new Chess("8/8/8/8/8/8/8/8 w - - 0 1"));
    setMoves([]);
    setEvalCp(null);
  };

  const piecePalette = useMemo(
    () => ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"],
    []
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/tools" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.group.tools")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("analyzeBoard.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("analyzeBoard.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => loadFen(START_FEN)}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10"
        >
          {t("analyzeBoard.reset")}
        </button>
        <button
          type="button"
          onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10"
        >
          {t("analyzeBoard.flip")}
        </button>
        <button
          type="button"
          onClick={() => setSetupMode((s) => !s)}
          className={`px-3 py-1.5 text-sm rounded-lg ${setupMode ? "african-gradient text-white" : "border hover:bg-white/10"}`}
        >
          {t("analyzeBoard.setup")}
        </button>
        <button
          type="button"
          onClick={clearBoard}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10"
        >
          {t("analyzeBoard.clear")}
        </button>
        <Link href="/editor" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10">
          {t("nav.boardEditor")}
        </Link>
        <Link href="/opening" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10">
          {t("nav.openingExplorer")}
        </Link>
      </div>

      {setupMode && (
        <div className="flex flex-wrap gap-2">
          {piecePalette.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPiece(p)}
              className={`px-2 py-1 text-xs border rounded ${selectedPiece === p ? "border-africhess-gold" : ""}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="aspect-square max-w-lg mx-auto rounded-xl overflow-hidden border border-white/20">
        <Chessboard
          position={game.fen()}
          boardOrientation={orientation}
          boardWidth={400}
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          arePiecesDraggable={!setupMode}
          customDarkSquareStyle={squareBase.dark as Record<string, string>}
          customLightSquareStyle={squareBase.light as Record<string, string>}
        />
      </div>

      {evalCp !== null && (
        <p className="text-center text-sm">
          {t("analyzeBoard.eval")}:{" "}
          <strong className="text-africhess-gold">
            {evalCp > 0 ? "+" : ""}
            {(evalCp / 100).toFixed(2)}
          </strong>
        </p>
      )}

      <div className="glass-card p-4">
        <p className="text-xs font-mono break-all opacity-70">{game.fen()}</p>
        {moves.length > 0 && (
          <p className="text-sm mt-2">{moves.join(" ")}</p>
        )}
      </div>
    </div>
  );
}

export default function AnalyzeBoardPage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeBoardInner />
    </Suspense>
  );
}
