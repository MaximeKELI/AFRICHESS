"use client";

import type { ReactNode } from "react";

export type PieceSetId = "classic" | "african";

const AFRICAN_PIECES: Record<string, string> = {
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

export function customPiecesForSet(
  setId: PieceSetId
): Record<string, ReactNode> | undefined {
  if (setId !== "african") return undefined;
  const out: Record<string, ReactNode> = {};
  for (const [k, v] of Object.entries(AFRICAN_PIECES)) {
    out[k] = (
      <span
        style={{
          fontSize: "2.8rem",
          lineHeight: 1,
          filter: k.startsWith("w")
            ? "drop-shadow(0 0 2px #C9A227)"
            : "drop-shadow(0 0 2px #1a1a1a)",
        }}
      >
        {v}
      </span>
    );
  }
  return out;
}
