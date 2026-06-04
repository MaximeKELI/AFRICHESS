/** Contrôle du temps partagé (IA + multijoueur). */

export const TIME_MINUTES_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
export type TimeMinutes = (typeof TIME_MINUTES_OPTIONS)[number];

export const DEFAULT_TIME_MINUTES: TimeMinutes = 10;

export function formatTimeControlLabel(
  isTimed: boolean,
  minutes?: number | null
): string {
  if (!isTimed) return "Sans limite";
  const m = minutes ?? DEFAULT_TIME_MINUTES;
  return `${m} min`;
}
