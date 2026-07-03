"use client";

import { useEffect, useState } from "react";
import { Trophy, Frown, Handshake } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";
import type { PlayerOutcome } from "@/lib/gameOutcome";

interface GameEndOverlayProps {
  outcome: PlayerOutcome;
  terminationReason?: string | null;
  result?: string | null;
  onContinue: () => void;
}

export function GameEndOverlay({
  outcome,
  terminationReason,
  result,
  onContinue,
}: GameEndOverlayProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const titleKey =
    outcome === "win"
      ? "play.gameEnd.win"
      : outcome === "loss"
        ? "play.gameEnd.loss"
        : "play.gameEnd.draw";

  const reasonKey = terminationReason
    ? (`play.gameEnd.reason.${terminationReason}` as const)
    : null;
  const reasonText =
    reasonKey && t(reasonKey) !== reasonKey
      ? t(reasonKey)
      : result
        ? result
        : null;

  const Icon =
    outcome === "win" ? Trophy : outcome === "loss" ? Frown : Handshake;

  return (
    <div
      className={clsx(
        "fixed inset-0 z-layer-game-end flex items-center justify-center p-4 transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-end-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onContinue}
        aria-hidden
      />
      <div
        className={clsx(
          "relative w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl border transition-transform duration-500 game-end-card",
          visible ? "scale-100 translate-y-0" : "scale-90 translate-y-4",
          outcome === "win" && "border-africhess-gold/60 bg-gradient-to-b from-africhess-green/30 to-black/90",
          outcome === "loss" && "border-africhess-terracotta/40 bg-gradient-to-b from-africhess-terracotta/20 to-black/90",
          outcome === "draw" && "border-white/30 bg-gradient-to-b from-white/10 to-black/90"
        )}
      >
        {outcome === "win" && (
          <div className="game-end-confetti pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden />
        )}
        <div
          className={clsx(
            "mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center",
            outcome === "win" && "bg-africhess-gold/25 text-africhess-gold",
            outcome === "loss" && "bg-africhess-terracotta/25 text-africhess-terracotta",
            outcome === "draw" && "bg-white/15 text-white/80"
          )}
        >
          <Icon className="w-8 h-8" aria-hidden />
        </div>
        <h2 id="game-end-title" className="font-display text-3xl font-bold mb-2">
          {t(titleKey)}
        </h2>
        {reasonText && (
          <p className="text-sm opacity-75 mb-6">{reasonText}</p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 rounded-xl african-gradient text-white font-semibold text-sm hover:opacity-90 transition"
        >
          {t("play.gameEnd.continue")}
        </button>
      </div>
    </div>
  );
}
