"use client";

import { useEffect, useRef } from "react";
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
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-title"
        className="glass-card p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="promotion-title" className="font-semibold text-center mb-4">
          Promotion du pion
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.piece}
              ref={i === 0 ? firstBtnRef : undefined}
              type="button"
              onClick={() => onSelect(opt.piece)}
              aria-label={`Promouvoir en ${opt.label}`}
              className={clsx(
                "flex flex-col items-center p-3 rounded-xl border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-africhess-gold",
                "border-africhess-gold/40 hover:bg-africhess-gold/20 hover:border-africhess-gold"
              )}
            >
              <span className="text-4xl" aria-hidden>
                {symbols[i]}
              </span>
              <span className="text-xs mt-1 opacity-80">{opt.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-4 py-2 text-sm opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-africhess-gold rounded"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
