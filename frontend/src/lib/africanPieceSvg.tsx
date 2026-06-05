"use client";

import type { Piece } from "react-chessboard/dist/chessboard/types";

const GOLD = "#D4A017";
const GREEN = "#1B5E3B";
const IVORY = "#F5E6C8";
const EBONY = "#1a1a1a";

function PieceSvg({
  piece,
  size,
}: {
  piece: Piece;
  size: number;
}) {
  const isWhite = piece.startsWith("w");
  const type = piece[1];
  const fill = isWhite ? IVORY : EBONY;
  const stroke = isWhite ? GOLD : GREEN;
  const accent = isWhite ? GOLD : "#C9A227";
  const s = size;
  const c = s / 2;

  const base = (
    <circle cx={c} cy={c} r={s * 0.38} fill={fill} stroke={stroke} strokeWidth={s * 0.04} />
  );

  switch (type) {
    case "P":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {base}
          <circle cx={c} cy={c * 0.72} r={s * 0.18} fill={accent} opacity={0.9} />
        </svg>
      );
    case "N":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {base}
          <path
            d={`M ${c - s * 0.15} ${c + s * 0.1} L ${c} ${c - s * 0.22} L ${c + s * 0.2} ${c + s * 0.05} Z`}
            fill={accent}
          />
        </svg>
      );
    case "B":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {base}
          <path
            d={`M ${c} ${c - s * 0.25} L ${c + s * 0.12} ${c + s * 0.15} L ${c - s * 0.12} ${c + s * 0.15} Z`}
            fill={accent}
          />
        </svg>
      );
    case "R":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect
            x={c - s * 0.28}
            y={c - s * 0.28}
            width={s * 0.56}
            height={s * 0.56}
            rx={s * 0.06}
            fill={fill}
            stroke={stroke}
            strokeWidth={s * 0.04}
          />
          <rect x={c - s * 0.2} y={c - s * 0.32} width={s * 0.4} height={s * 0.08} fill={accent} />
        </svg>
      );
    case "Q":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {base}
          <polygon
            points={`${c},${c - s * 0.28} ${c + s * 0.22},${c + s * 0.12} ${c - s * 0.22},${c + s * 0.12}`}
            fill={accent}
          />
          <circle cx={c} cy={c - s * 0.08} r={s * 0.06} fill={stroke} />
        </svg>
      );
    case "K":
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {base}
          <line x1={c} y1={c - s * 0.28} x2={c} y2={c - s * 0.08} stroke={accent} strokeWidth={s * 0.06} />
          <line x1={c - s * 0.08} y1={c - s * 0.18} x2={c + s * 0.08} y2={c - s * 0.18} stroke={accent} strokeWidth={s * 0.06} />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {base}
        </svg>
      );
  }
}

export function renderAfricanSvgPiece(piece: Piece, squareWidth: number) {
  return <PieceSvg piece={piece} size={squareWidth} />;
}
