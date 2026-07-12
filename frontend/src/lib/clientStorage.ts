/** Lecture localStorage — valeurs SSR-safe (defaults fixes côté serveur). */

export type StoredLocale = "en" | "fr" | "ar" | "pt" | "sw";

const LOCALES: StoredLocale[] = ["en", "fr", "ar", "pt", "sw"];

export function readStoredLocale(fallback: StoredLocale = "fr"): StoredLocale {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem("locale");
  return LOCALES.includes(raw as StoredLocale) ? (raw as StoredLocale) : fallback;
}

export function readStoredDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("theme") === "dark";
}

export function readStoredLowBandwidth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("lowBandwidth") === "1";
}

/** Applique les classes DOM liées aux prefs auth (après hydratation client). */
export function applyAuthDomClasses(darkMode: boolean, lowBandwidth: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", darkMode);
  document.documentElement.classList.toggle("low-bandwidth", lowBandwidth);
}
