"use client";

import clsx from "clsx";
import { formatClock } from "@/lib/clock";

interface GameClockProps {
  whiteMs: number;
  blackMs: number;
  turn: "w" | "b";
  running: boolean;
  orientation: "white" | "black";
  incrementMs?: number;
  label?: string;
}

export function GameClock({
  whiteMs,
  blackMs,
  turn,
  running,
  orientation,
  incrementMs = 0,
  label,
}: GameClockProps) {
  const topIsWhite = orientation === "black";
  const topMs = topIsWhite ? whiteMs : blackMs;
  const bottomMs = topIsWhite ? blackMs : whiteMs;
  const topTurn = topIsWhite ? turn === "w" : turn === "b";
  const bottomTurn = !topTurn;

  const ClockRow = ({
    ms,
    active,
    side,
  }: {
    ms: number;
    active: boolean;
    side: string;
  }) => (
    <div
      className={clsx(
        "flex justify-between items-center px-4 py-3 rounded-xl font-mono text-2xl font-bold transition-all",
        active && running
          ? "bg-africhess-gold/25 ring-2 ring-africhess-gold text-africhess-gold"
          : "bg-black/20 text-white/90",
        ms < 10000 && running && "text-africhess-terracotta animate-pulse"
      )}
    >
      <span className="text-xs font-sans font-normal opacity-70">{side}</span>
      <span>{formatClock(ms)}</span>
    </div>
  );

  return (
    <div className="space-y-2 w-full max-w-[min(100%,560px)] mx-auto">
      {label && (
        <p className="text-center text-xs opacity-60">
          {label}
          {incrementMs > 0 && ` · +${incrementMs / 1000}s`}
        </p>
      )}
      <ClockRow ms={topMs} active={topTurn} side={topIsWhite ? "Blancs" : "Noirs"} />
      <ClockRow ms={bottomMs} active={bottomTurn} side={topIsWhite ? "Noirs" : "Blancs"} />
    </div>
  );
}
