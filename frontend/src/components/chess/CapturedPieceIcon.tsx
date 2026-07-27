"use client";

import { PIECE_SYMBOLS } from "@/lib/chessDisplay";
import { renderAfricanSvgPiece } from "@/lib/africanPieceSvg";
import { getPieceSet, pieceSvgUrl, type PieceSetId } from "@/lib/pieceSets";
import type { Piece } from "react-chessboard/dist/chessboard/types";

function toBoardPiece(pieceKey: string): Piece {
  return `${pieceKey[0]}${pieceKey[1].toUpperCase()}` as Piece;
}

interface CapturedPieceIconProps {
  pieceKey: string;
  size: number;
  pieceSet: PieceSetId;
}

export function CapturedPieceIcon({ pieceKey, size, pieceSet }: CapturedPieceIconProps) {
  const meta = getPieceSet(pieceSet);
  const boardPiece = toBoardPiece(pieceKey);

  if (meta.folder) {
    return (
      <span
        className="board-captured-piece inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pieceSvgUrl(meta.folder, boardPiece)}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </span>
    );
  }

  if (pieceSet === "african-svg") {
    return (
      <span
        className="board-captured-piece inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {renderAfricanSvgPiece(boardPiece, size)}
      </span>
    );
  }

  return (
    <span
      className="board-captured-piece inline-flex shrink-0 items-center justify-center leading-none select-none"
      style={{ fontSize: Math.round(size * 0.95), width: size, height: size }}
      aria-hidden
    >
      {PIECE_SYMBOLS[pieceKey] ?? pieceKey}
    </span>
  );
}
