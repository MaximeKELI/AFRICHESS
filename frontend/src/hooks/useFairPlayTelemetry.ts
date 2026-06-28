"use client";

import { useCallback, useEffect, useRef } from "react";

export type FairPlayTelemetryPatch = {
  tab_blur?: number;
  focus_loss_ms?: number;
  window_switch?: number;
  copy_paste?: number;
  devtools?: number;
  mouse_entropy?: number;
  premove?: number;
};

function shannonEntropy(values: number[]): number {
  if (values.length < 4) return 0.5;
  const bins = 8;
  const counts = new Array(bins).fill(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor(((v - min) / span) * bins));
    counts[idx] += 1;
  }
  let entropy = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / values.length;
    entropy -= p * Math.log2(p);
  }
  return entropy / Math.log2(bins);
}

export function useFairPlayTelemetry(enabled: boolean) {
  const patchRef = useRef<FairPlayTelemetryPatch>({});
  const mouseDeltasRef = useRef<number[]>([]);
  const hiddenSinceRef = useRef<number | null>(null);
  const blurSinceRef = useRef<number | null>(null);

  const resetPatch = useCallback(() => {
    patchRef.current = {};
    mouseDeltasRef.current = [];
  }, []);

  const consumePatch = useCallback((): FairPlayTelemetryPatch | undefined => {
    const p = patchRef.current;
    const hasData =
      (p.tab_blur ?? 0) > 0 ||
      (p.focus_loss_ms ?? 0) > 0 ||
      (p.window_switch ?? 0) > 0 ||
      (p.copy_paste ?? 0) > 0 ||
      (p.devtools ?? 0) > 0 ||
      (p.premove ?? 0) > 0 ||
      (p.mouse_entropy ?? 0) > 0;
    resetPatch();
    return hasData ? { ...p } : undefined;
  }, [resetPatch]);

  const notePremove = useCallback(() => {
    if (!enabled) return;
    patchRef.current.premove = (patchRef.current.premove ?? 0) + 1;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
        patchRef.current.tab_blur = (patchRef.current.tab_blur ?? 0) + 1;
      } else if (hiddenSinceRef.current) {
        patchRef.current.focus_loss_ms =
          (patchRef.current.focus_loss_ms ?? 0) + (Date.now() - hiddenSinceRef.current);
        hiddenSinceRef.current = null;
      }
    };

    const onBlur = () => {
      blurSinceRef.current = Date.now();
      patchRef.current.window_switch = (patchRef.current.window_switch ?? 0) + 1;
    };

    const onFocus = () => {
      if (blurSinceRef.current) {
        patchRef.current.focus_loss_ms =
          (patchRef.current.focus_loss_ms ?? 0) + (Date.now() - blurSinceRef.current);
        blurSinceRef.current = null;
      }
    };

    const onCopyPaste = () => {
      patchRef.current.copy_paste = (patchRef.current.copy_paste ?? 0) + 1;
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltas = mouseDeltasRef.current;
      if (deltas.length > 0) {
        const prev = deltas[deltas.length - 1];
        deltas.push(Math.hypot(e.movementX, e.movementY) + prev * 0.01);
      } else {
        deltas.push(Math.hypot(e.movementX, e.movementY));
      }
      if (deltas.length > 48) {
        deltas.shift();
      }
      patchRef.current.mouse_entropy = shannonEntropy(deltas);
    };

    let devtoolsOpen = false;
    const devtoolsInterval = window.setInterval(() => {
      const threshold = 160;
      const opened =
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;
      if (opened && !devtoolsOpen) {
        devtoolsOpen = true;
        patchRef.current.devtools = (patchRef.current.devtools ?? 0) + 1;
      } else if (!opened) {
        devtoolsOpen = false;
      }
    }, 1500);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("copy", onCopyPaste);
    window.addEventListener("paste", onCopyPaste);
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.clearInterval(devtoolsInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("copy", onCopyPaste);
      window.removeEventListener("paste", onCopyPaste);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [enabled]);

  return { consumePatch, notePremove };
}
