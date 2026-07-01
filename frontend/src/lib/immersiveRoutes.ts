/** Routes plein écran : pas de footer ni barre de navigation mobile. */
export const IMMERSIVE_ROUTE_PREFIXES = [
  "/play",
  "/puzzles",
  "/watch",
  "/learning/analyze/board",
] as const;

export function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}
