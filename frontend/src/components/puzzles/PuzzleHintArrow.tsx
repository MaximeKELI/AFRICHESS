"use client";

import { useMemo } from "react";
import { Chess, type Square } from "chess.js";
import {
  hintArrowWaypoints,
  toBoardPercent,
  squareToFileRank,
} from "@/lib/puzzleHintArrow";

interface PuzzleHintArrowProps {
  from: string;
  to: string;
  fen: string;
  orientation?: "white" | "black";
}

/** Flèche verte directionnelle (tour/fou/cavalier…) pour l'indice puzzle. */
export function PuzzleHintArrow({
  from,
  to,
  fen,
  orientation = "white",
}: PuzzleHintArrowProps) {
  const { segments, origin } = useMemo(() => {
    let pieceType = "q";
    try {
      const chess = new Chess(fen === "start" ? undefined : fen);
      pieceType = chess.get(from as Square)?.type ?? "q";
    } catch {
      /* keep default */
    }
    const waypoints = hintArrowWaypoints(from, to, pieceType);
    const originPt = toBoardPercent(squareToFileRank(from), orientation);

    const segs: string[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = toBoardPercent(waypoints[i], orientation);
      const b = toBoardPercent(waypoints[i + 1], orientation);
      segs.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
    }

    return { segments: segs, origin: originPt };
  }, [from, to, fen, orientation]);

  if (!segments.length) return null;

  const markerId = `puzzle-hint-arrow-${from}-${to}`.replace(/[^a-z0-9-]/gi, "");

  return (
    <svg
      className="puzzle-hint-arrow-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="5"
          markerHeight="5"
          refX="4.2"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#4ade80" />
        </marker>
        <filter id={`${markerId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#22c55e" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* Anneau sur la pièce à déplacer */}
      <circle
        cx={origin.x}
        cy={origin.y}
        r="3.8"
        fill="none"
        stroke="#4ade80"
        strokeWidth="0.65"
        className="puzzle-hint-origin-ring"
      />

      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={i === segments.length - 1 ? `url(#${markerId})` : undefined}
          filter={`url(#${markerId}-glow)`}
          className="puzzle-hint-arrow-segment"
        />
      ))}

      {/* Point d'arrivée */}
      {(() => {
        const dest = toBoardPercent(squareToFileRank(to), orientation);
        return (
          <circle
            cx={dest.x}
            cy={dest.y}
            r="2.2"
            fill="#4ade80"
            opacity="0.85"
            className="puzzle-hint-dest-dot"
          />
        );
      })()}
    </svg>
  );
}
