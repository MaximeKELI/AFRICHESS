"use client";

import { useEffect, useRef, useState } from "react";

/** Décompte local synchronisé avec le serveur (même logique que GameClock). */
export function useLiveClock(
  whiteMs: number,
  blackMs: number,
  turn: "w" | "b",
  running: boolean,
  onFlag?: (side: "w" | "b") => void
) {
  const [white, setWhite] = useState(whiteMs);
  const [black, setBlack] = useState(blackMs);
  const turnRef = useRef(turn);
  const onFlagRef = useRef(onFlag);
  const flaggedRef = useRef(false);

  useEffect(() => {
    onFlagRef.current = onFlag;
  }, [onFlag]);

  useEffect(() => {
    setWhite(whiteMs);
    setBlack(blackMs);
    flaggedRef.current = false;
  }, [whiteMs, blackMs]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (turnRef.current === "w") {
        setWhite((t) => {
          const next = Math.max(0, t - 250);
          if (next === 0 && t > 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            onFlagRef.current?.("w");
          }
          return next;
        });
      } else {
        setBlack((t) => {
          const next = Math.max(0, t - 250);
          if (next === 0 && t > 0 && !flaggedRef.current) {
            flaggedRef.current = true;
            onFlagRef.current?.("b");
          }
          return next;
        });
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  return { white, black };
}
