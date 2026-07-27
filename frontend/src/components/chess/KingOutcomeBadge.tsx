"use client";

import type { ReactElement } from "react";
import type { Piece } from "react-chessboard/dist/chessboard/types";
import { pieceSvgUrl } from "@/lib/pieceSets";

export type KingOutcome = "win" | "loss";

type PieceRenderProps = { squareWidth: number; isDragging: boolean };

type PieceRenderer = (props: PieceRenderProps) => ReactElement;

function CrownIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: "block" }}
    >
      <path
        d="M3.5 17.5h17l-1.2-9.2-4.3 4.1L12 6.5l-3 5.9-4.3-4.1L3.5 17.5z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M4.2 19.2h15.6v1.6H4.2z" fill="#fff" />
    </svg>
  );
}

/** Badge Chess.com : couronne blanche sur pastille verte (gagnant) ou rouge (perdant). */
export function KingOutcomeBadge({
  outcome,
  size,
  corner,
}: {
  outcome: KingOutcome;
  size: number;
  corner: "top-right" | "bottom-right";
}) {
  const icon = Math.max(8, Math.round(size * 0.58));
  return (
    <span
      className={
        outcome === "win"
          ? "king-outcome-badge king-outcome-badge--win"
          : "king-outcome-badge king-outcome-badge--loss"
      }
      style={{
        width: size,
        height: size,
        ...(corner === "top-right"
          ? { top: 1, right: 1 }
          : { bottom: 1, right: 1 }),
      }}
      aria-hidden
    >
      <CrownIcon size={icon} />
    </span>
  );
}

function FallbackKingImg({ pieceKey, squareWidth }: { pieceKey: "wK" | "bK"; squareWidth: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pieceSvgUrl("cburnett", pieceKey)}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}

/** Enveloppe le rendu du roi : badge + spin du perdant (2 tours). */
export function wrapKingWithOutcome(
  Base: PieceRenderer | undefined,
  pieceKey: "wK" | "bK",
  outcome: KingOutcome,
  spin: boolean,
  /** Clé pour relancer l’anim à chaque mat. */
  spinKey: string
): PieceRenderer {
  const corner: "top-right" | "bottom-right" =
    pieceKey === "bK" ? "top-right" : "bottom-right";

  return ({ squareWidth, isDragging }) => {
    const badgeSize = Math.max(14, Math.round(squareWidth * 0.3));
    return (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isDragging ? 0.85 : 1,
        }}
      >
        <div
          key={spin ? `${spinKey}-spin` : spinKey}
          className={spin ? "king-piece-lose-spin" : undefined}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Base ? (
            <Base squareWidth={squareWidth} isDragging={isDragging} />
          ) : (
            <FallbackKingImg pieceKey={pieceKey} squareWidth={squareWidth} />
          )}
        </div>
        <KingOutcomeBadge outcome={outcome} size={badgeSize} corner={corner} />
      </div>
    );
  };
}

export function applyKingOutcomesToPieces(
  base: Partial<Record<Piece, PieceRenderer>> | undefined,
  winner: "w" | "b",
  spinLoser: boolean,
  spinKey: string
): Partial<Record<Piece, PieceRenderer>> {
  const loser = winner === "w" ? "b" : "w";
  const winKey = `${winner}K` as "wK" | "bK";
  const loseKey = `${loser}K` as "wK" | "bK";
  return {
    ...base,
    [winKey]: wrapKingWithOutcome(base?.[winKey], winKey, "win", false, spinKey),
    [loseKey]: wrapKingWithOutcome(base?.[loseKey], loseKey, "loss", spinLoser, spinKey),
  };
}
