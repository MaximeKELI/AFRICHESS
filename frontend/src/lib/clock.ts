/** Affichage chrono (ms → M:SS ou H:MM:SS). */

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const MODE_CLOCK_LABEL: Record<string, string> = {
  bullet: "1+0",
  blitz: "3+2",
  rapid: "10+0",
  classical: "30+0",
  ai: "—",
};
