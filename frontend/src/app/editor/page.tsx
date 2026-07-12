"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useTranslation } from "@/hooks/useTranslation";
import { getBoardTheme, getThemedSquareStyles } from "@/lib/boardThemes";
import { usePreferencesStore } from "@/store/preferences";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";

type Castling = { K: boolean; Q: boolean; k: boolean; q: boolean };

function buildFen(
  board: string,
  turn: "w" | "b",
  castling: Castling,
  ep: string,
  halfmove: number,
  fullmove: number
): string {
  const castle =
    `${castling.K ? "K" : ""}${castling.Q ? "Q" : ""}${castling.k ? "k" : ""}${castling.q ? "q" : ""}` ||
    "-";
  return `${board} ${turn} ${castle} ${ep.trim() || "-"} ${halfmove} ${fullmove}`;
}

export default function BoardEditorPage() {
  const { t } = useTranslation();
  const boardThemeId = usePreferencesStore((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);
  const squareBase = useMemo(() => getThemedSquareStyles(theme), [theme]);

  const [game, setGame] = useState(() => new Chess());
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [selectedPiece, setSelectedPiece] = useState<string | null>("wP");
  const [fenInput, setFenInput] = useState(START_FEN);
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [castling, setCastling] = useState<Castling>({ K: true, Q: true, k: true, q: true });
  const [ep, setEp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const syncFromGame = useCallback((g: Chess) => {
    const fen = g.fen();
    setFenInput(fen);
    const parts = fen.split(" ");
    setTurn((parts[1] as "w" | "b") || "w");
    const c = parts[2] || "-";
    setCastling({
      K: c.includes("K"),
      Q: c.includes("Q"),
      k: c.includes("k"),
      q: c.includes("q"),
    });
    setEp(parts[3] && parts[3] !== "-" ? parts[3] : "");
  }, []);

  const loadFen = useCallback(
    (raw: string) => {
      try {
        const g = new Chess(raw.trim());
        setGame(g);
        syncFromGame(g);
        setError(null);
      } catch {
        setError(t("editor.invalidFen"));
      }
    },
    [syncFromGame, t]
  );

  const applyMeta = (nextTurn: "w" | "b", nextCastling: Castling, nextEp: string) => {
    const parts = game.fen().split(" ");
    loadFen(
      buildFen(parts[0], nextTurn, nextCastling, nextEp, Number(parts[4] || 0), Number(parts[5] || 1))
    );
  };

  const onSquareClick = (square: string) => {
    const g = new Chess(game.fen());
    if (!selectedPiece || selectedPiece === "erase") {
      g.remove(square as Square);
    } else {
      g.remove(square as Square);
      const color = selectedPiece[0] === "w" ? "w" : "b";
      const type = selectedPiece[1].toLowerCase() as "p" | "n" | "b" | "r" | "q" | "k";
      try {
        g.put({ type, color }, square as Square);
      } catch {
        return;
      }
    }
    setGame(g);
    syncFromGame(g);
  };

  const piecePalette = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP", "erase"];
  const analyzeHref = `/analysis?fen=${encodeURIComponent(game.fen())}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/tools" className="text-sm text-africhess-gold hover:underline">
        ← {t("nav.group.tools")}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{t("editor.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("editor.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => loadFen(START_FEN)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10">
          {t("editor.startPosition")}
        </button>
        <button type="button" onClick={() => loadFen(EMPTY_FEN)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10">
          {t("editor.clear")}
        </button>
        <button
          type="button"
          onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10"
        >
          {t("editor.flip")}
        </button>
        <Link href={analyzeHref} className="px-3 py-1.5 text-sm rounded-lg african-gradient text-white">
          {t("editor.analyze")}
        </Link>
        <Link href="/bots" className="px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10">
          {t("editor.playAi")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {piecePalette.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSelectedPiece(p)}
            className={`px-2 py-1 text-xs border rounded ${selectedPiece === p ? "border-africhess-gold bg-africhess-gold/10" : ""}`}
          >
            {p === "erase" ? t("editor.erase") : p}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="aspect-square max-w-lg mx-auto w-full rounded-xl overflow-hidden border border-white/20">
          <Chessboard
            position={game.fen()}
            boardOrientation={orientation}
            boardWidth={420}
            onSquareClick={onSquareClick}
            arePiecesDraggable={false}
            customDarkSquareStyle={squareBase.dark as Record<string, string>}
            customLightSquareStyle={squareBase.light as Record<string, string>}
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">{t("editor.sideToMove")}</p>
            <div className="flex gap-2">
              {(["w", "b"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyMeta(c, castling, ep)}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${turn === c ? "border-africhess-gold bg-africhess-gold/10" : ""}`}
                >
                  {c === "w" ? t("editor.white") : t("editor.black")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{t("editor.castling")}</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["K", "editor.castleWK"],
                  ["Q", "editor.castleWQ"],
                  ["k", "editor.castleBK"],
                  ["q", "editor.castleBQ"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={castling[key]}
                    onChange={(e) =>
                      applyMeta(turn, { ...castling, [key]: e.target.checked }, ep)
                    }
                  />
                  {t(label)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t("editor.enPassant")}</label>
            <div className="flex gap-2">
              <input
                value={ep}
                onChange={(e) => setEp(e.target.value)}
                placeholder="e3"
                className="flex-1 px-3 py-2 rounded-lg border bg-transparent text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => applyMeta(turn, castling, ep)}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-white/10"
              >
                {t("editor.applyFen")}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">FEN</label>
            <textarea
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => loadFen(fenInput)}
              className="mt-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-white/10"
            >
              {t("editor.applyFen")}
            </button>
          </div>

          {error && <p className="text-sm text-africhess-terracotta">{error}</p>}
        </div>
      </div>
    </div>
  );
}
