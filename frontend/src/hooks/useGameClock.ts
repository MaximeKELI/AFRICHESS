"use client";

import { useEffect, useRef, useState } from "react";

export function useGameClock(
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
        setWhite((t) => Math.max(0, t - 100));
      } else {
        setBlack((t) => Math.max(0, t - 100));
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const getSpentMs = (playerIsWhite: boolean) => {
    const start = playerIsWhite ? whiteMs : blackMs;
    const current = playerIsWhite ? white : black;
    return Math.max(0, start - current);
  };

  return { white, black, getSpentMs };
}
