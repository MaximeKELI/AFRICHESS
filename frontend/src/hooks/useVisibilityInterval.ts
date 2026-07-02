"use client";

import { useEffect, useRef } from "react";

/** Intervalle qui se met en pause quand l'onglet est caché. */
export function useVisibilityInterval(
  callback: () => void,
  ms: number,
  enabled = true
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled || ms <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => callbackRef.current();
    const start = () => {
      if (timer !== null) return;
      tick();
      timer = setInterval(tick, ms);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ms, enabled]);
}
