/** Couleurs de flèches façon Lichess (commentaire / analyse). */
export const ARROW_BRUSHES = {
  green: "rgba(21, 120, 27, 0.85)",
  red: "rgba(136, 32, 32, 0.85)",
  blue: "rgba(0, 48, 136, 0.85)",
  yellow: "rgba(230, 143, 0, 0.9)",
  /** Orange Lichess / stream (flèches d’analyse). */
  orange: "rgba(255, 170, 0, 0.88)",
} as const;

export type ArrowBrushId = keyof typeof ARROW_BRUSHES;

export function arrowBrushFromModifiers(e: {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): string {
  if (e.shiftKey) return ARROW_BRUSHES.red;
  if (e.altKey) return ARROW_BRUSHES.blue;
  if (e.ctrlKey || e.metaKey) return ARROW_BRUSHES.yellow;
  return ARROW_BRUSHES.green;
}
