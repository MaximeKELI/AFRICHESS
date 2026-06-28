/** Pages où l'arrière-plan personnalisé s'affiche (pas l'accueil ni les pages publiques). */

const SITE_BACKGROUND_PREFIXES = [
  "/play",
  "/puzzles",
  "/learning",
  "/training",
  "/simul",
  "/watch",
] as const;

export function shouldShowSiteBackground(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return false;
  if (pathname === "/profile") return true;
  return SITE_BACKGROUND_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
