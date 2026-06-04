"use client";

import { PIECE_SYMBOLS, type CapturedState } from "@/lib/chessDisplay";

interface CapturedPiecesProps {
  captured: CapturedState;
  orientation?: "white" | "black";
}

export function CapturedPieces({ captured, orientation = "white" }: CapturedPiecesProps) {
  const topLabel = orientation === "white" ? "Blancs ont pris" : "Noirs ont pris";
  const bottomLabel = orientation === "white" ? "Noirs ont pris" : "Blancs ont pris";
  const topPieces = captured.byWhite;
  const bottomPieces = captured.byBlack;
  const topAdvantage = captured.materialWhite - captured.materialBlack;
  const bottomAdvantage = captured.materialBlack - captured.materialWhite;

  return (
    <div className="space-y-3 text-sm">
      <CapturedRow
        label={topLabel}
        pieces={topPieces}
        advantage={topAdvantage > 0 ? `+${topAdvantage}` : undefined}
        pieceClass="text-[var(--text)]"
      />
      <CapturedRow
        label={bottomLabel}
        pieces={bottomPieces}
        advantage={bottomAdvantage > 0 ? `+${bottomAdvantage}` : undefined}
        pieceClass="opacity-70"
      />
    </div>
  );
}

function CapturedRow({
  label,
  pieces,
  advantage,
  pieceClass,
}: {
  label: string;
  pieces: string[];
  advantage?: string;
  pieceClass: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs opacity-60 uppercase tracking-wide">{label}</span>
        {advantage && (
          <span className="text-xs font-mono text-africhess-green font-semibold">{advantage}</span>
        )}
      </div>
      <div className={`min-h-[28px] flex flex-wrap gap-0.5 items-center ${pieceClass}`}>
        {pieces.length === 0 ? (
          <span className="text-xs opacity-30">—</span>
        ) : (
          pieces.map((key, i) => (
            <span key={`${key}-${i}`} className="text-xl leading-none" title={key}>
              {PIECE_SYMBOLS[key] ?? key}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
