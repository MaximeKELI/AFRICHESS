"use client";

import clsx from "clsx";

type PromoPiece = "q" | "r" | "b" | "n";

const OPTIONS: { piece: PromoPiece; label: string; symbol: string }[] = [
  { piece: "q", label: "Dame", symbol: "♕" },
  { piece: "r", label: "Tour", symbol: "♖" },
  { piece: "b", label: "Fou", symbol: "♗" },
  { piece: "n", label: "Cavalier", symbol: "♘" },
];

interface PromotionDialogProps {
  color: "w" | "b";
  onSelect: (piece: PromoPiece) => void;
  onCancel: () => void;
}

export function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  const symbols = color === "w" ? ["♕", "♖", "♗", "♘"] : ["♛", "♜", "♝", "♞"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-card p-6 max-w-sm w-full">
        <h3 className="font-semibold text-center mb-4">Promotion du pion</h3>
        <div className="grid grid-cols-4 gap-3">
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.piece}
              type="button"
              onClick={() => onSelect(opt.piece)}
              className={clsx(
                "flex flex-col items-center p-3 rounded-xl border-2",
                "border-africhess-gold/40 hover:bg-africhess-gold/20 hover:border-africhess-gold"
              )}
            >
              <span className="text-4xl">{symbols[i]}</span>
              <span className="text-xs mt-1 opacity-80">{opt.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-4 py-2 text-sm opacity-70 hover:opacity-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
