import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export type FairPlayTelemetryPatch = {
  tab_blur?: number;
  focus_loss_ms?: number;
  window_switch?: number;
};

/** Télémétrie Fair Play mobile (AppState — focus/perte d'app). */
export function useFairPlayTelemetry(enabled: boolean) {
  const patchRef = useRef<FairPlayTelemetryPatch>({});
  const hiddenSinceRef = useRef<number | null>(null);

  const resetPatch = useCallback(() => {
    patchRef.current = {};
  }, []);

  const consumePatch = useCallback((): FairPlayTelemetryPatch | undefined => {
    const p = patchRef.current;
    const hasData = (p.tab_blur ?? 0) > 0 || (p.focus_loss_ms ?? 0) > 0 || (p.window_switch ?? 0) > 0;
    resetPatch();
    return hasData ? { ...p } : undefined;
  }, [resetPatch]);

  useEffect(() => {
    if (!enabled) return;

    const onChange = (next: AppStateStatus) => {
      if (next === "active") {
        if (hiddenSinceRef.current) {
          patchRef.current.focus_loss_ms =
            (patchRef.current.focus_loss_ms ?? 0) + (Date.now() - hiddenSinceRef.current);
          hiddenSinceRef.current = null;
        }
      } else {
        hiddenSinceRef.current = Date.now();
        patchRef.current.tab_blur = (patchRef.current.tab_blur ?? 0) + 1;
        patchRef.current.window_switch = (patchRef.current.window_switch ?? 0) + 1;
      }
    };

    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [enabled]);

  return { consumePatch };
}
