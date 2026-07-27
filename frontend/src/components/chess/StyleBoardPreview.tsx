"use client";

import { useMemo } from "react";
import clsx from "clsx";
import {
  getBoardTheme,
  getThemedSquareStyles,
  type BoardThemeId,
} from "@/lib/boardThemes";
import {
  getPieceSet,
  pieceSvgUrl,
  type PieceSetId,
} from "@/lib/pieceSets";
import type { Piece } from "react-chessboard/dist/chessboard/types";

/** Disposition 3×3 type aperçu Chess.com. */
const PREVIEW_GRID: Array<Piece | null> = [
  "bB",
  "bQ",
  "bP",
  "wN",
  "wK",
  "wR",
  null,
  null,
  null,
];

function PiecePreviewGlyph({
  piece,
  setId,
  size,
}: {
  piece: Piece;
  setId: PieceSetId;
  size: number;
}) {
  const meta = getPieceSet(setId);
  if (meta.folder) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pieceSvgUrl(meta.folder, piece)}
        alt=""
        draggable={false}
        style={{ width: size * 0.88, height: size * 0.88, objectFit: "contain" }}
      />
    );
  }
  const isWhite = piece.startsWith("w");
  const kind = piece[1];
  const map: Record<string, string> = {
    P: isWhite ? "♙" : "♟",
    N: isWhite ? "♘" : "♞",
    B: isWhite ? "♗" : "♝",
    R: isWhite ? "♖" : "♜",
    Q: isWhite ? "♕" : "♛",
    K: isWhite ? "♔" : "♚",
  };
  return (
    <span
      className={clsx(
        "leading-none select-none",
        setId === "african" || setId === "african-svg"
          ? "text-africhess-gold"
          : isWhite
            ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]"
            : "text-neutral-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]"
      )}
      style={{ fontSize: size * 0.72 }}
      aria-hidden
    >
      {map[kind] ?? "·"}
    </span>
  );
}

export interface StyleBoardPreviewProps {
  boardThemeId: BoardThemeId;
  pieceSetId: PieceSetId;
  /** Taille d'une case en px */
  squareSize?: number;
  className?: string;
  /** Fond derrière le mini-plateau (aperçu arrière-plan). */
  backdropSrc?: string | null;
}

/** Aperçu live plateau + pièces (grille 3×3). */
export function StyleBoardPreview({
  boardThemeId,
  pieceSetId,
  squareSize = 56,
  className,
  backdropSrc,
}: StyleBoardPreviewProps) {
  const theme = getBoardTheme(boardThemeId);
  const { dark, light } = useMemo(() => getThemedSquareStyles(theme), [theme]);
  const size = Math.max(40, Math.min(72, squareSize));

  return (
    <div
      className={clsx(
        "relative rounded-xl overflow-hidden ring-1 ring-white/15 shadow-lg shrink-0",
        className
      )}
      style={{ width: size * 3, height: size * 3 }}
      aria-hidden
    >
      {backdropSrc && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url('${backdropSrc}')` }}
        />
      )}
      <div className="relative grid grid-cols-3 grid-rows-3 w-full h-full">
        {PREVIEW_GRID.map((piece, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const isLight = (row + col) % 2 === 0;
          return (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{
                width: size,
                height: size,
                ...(isLight ? light : dark),
              }}
            >
              {piece && <PiecePreviewGlyph piece={piece} setId={pieceSetId} size={size} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Icône chevalier pour la grille de sélection de sets. */
export function PieceSetKnightIcon({
  setId,
  size = 36,
}: {
  setId: PieceSetId;
  size?: number;
}) {
  return <PiecePreviewGlyph piece="wN" setId={setId} size={size} />;
}
