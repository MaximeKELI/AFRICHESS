"use client";

import { memo, useEffect, useRef, useState } from "react";
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

function GameClockInner({
  whiteMs,
  blackMs,
  turn,
  running,
  orientation,
  incrementMs = 0,
  label,
}: GameClockProps) {
  const [white, setWhite] = useState(whiteMs);
  const [black, setBlack] = useState(blackMs);
  const turnRef = useRef(turn);

  useEffect(() => {
    setWhite(whiteMs);
    setBlack(blackMs);
  }, [whiteMs, blackMs]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (turnRef.current === "w") {
        setWhite((t) => Math.max(0, t - 250));
      } else {
        setBlack((t) => Math.max(0, t - 250));
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const topIsWhite = orientation === "black";
  const topMs = topIsWhite ? white : black;
  const bottomMs = topIsWhite ? black : white;
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
        "flex justify-between items-center px-4 py-3 rounded-xl font-mono text-2xl font-bold",
        active && running
          ? "bg-africhess-gold/25 ring-2 ring-africhess-gold text-africhess-gold"
          : "bg-black/20 text-white/90",
        ms < 10000 && running && active && "text-africhess-terracotta"
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

export const GameClock = memo(GameClockInner);
