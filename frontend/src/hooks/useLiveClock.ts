"use client";

import { useEffect, useRef, useState } from "react";

/** Décompte local synchronisé avec le serveur (même logique que GameClock). */
export function useLiveClock(
  whiteMs: number,
  blackMs: number,
  turn: "w" | "b",
  running: boolean
) {
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

  return { white, black };
}
