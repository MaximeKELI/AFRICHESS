"use client";

import type { CustomPieces, Piece } from "react-chessboard/dist/chessboard/types";
import { renderAfricanSvgPiece } from "./africanPieceSvg";

export type PieceSetId = "classic" | "african" | "african-svg";

const AFRICAN_SYMBOLS: Record<Piece, string> = {
  wP: "♙",
  wN: "♘",
  wB: "♗",
  wR: "♖",
  wQ: "♕",
  wK: "♔",
  bP: "♟",
  bN: "♞",
  bB: "♝",
  bR: "♜",
  bQ: "♛",
  bK: "♚",
};

/** react-chessboard v4 exige des fonctions (pas des ReactNode statiques). */
export function customPiecesForSet(setId: PieceSetId): CustomPieces | undefined {
  if (setId === "african-svg") {
    const out: CustomPieces = {};
    const keys: Piece[] = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"];
    for (const key of keys) {
      out[key] = ({ squareWidth, isDragging }) => (
        <div
          style={{
            width: squareWidth,
            height: squareWidth,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isDragging ? 0.85 : 1,
          }}
        >
          {renderAfricanSvgPiece(key, squareWidth)}
        </div>
      );
    }
    return out;
  }

  if (setId !== "african") return undefined;

  const out: CustomPieces = {};
  for (const [key, symbol] of Object.entries(AFRICAN_SYMBOLS) as [Piece, string][]) {
    const isWhite = key.startsWith("w");
    const pieceName = key.slice(1);
    const colorLabel = isWhite ? "blanc" : "noir";
    out[key] = ({ squareWidth, isDragging }) => (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(squareWidth * 0.72),
          lineHeight: 1,
          userSelect: "none",
          opacity: isDragging ? 0.85 : 1,
          filter: isWhite
            ? "drop-shadow(0 0 2px #C9A227)"
            : "drop-shadow(0 0 2px #1a1a1a)",
        }}
      >
        <span className="sr-only">{`${pieceName} ${colorLabel}`}</span>
        <span aria-hidden>{symbol}</span>
      </div>
    );
  }
  return out;
}
