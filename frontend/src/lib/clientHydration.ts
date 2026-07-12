/** Hydratation client après le premier rendu SSR (évite mismatch React). */

import {
  applyAuthDomClasses,
  readStoredDarkMode,
  readStoredLocale,
  readStoredLowBandwidth,
} from "@/lib/clientStorage";
import { useAuthStore } from "@/store/auth";
import { syncPreferencesForUser } from "@/store/preferences";

let hydrated = false;

export function hydrateClientStoresFromStorage(): void {
  if (typeof window === "undefined" || hydrated) return;
  hydrated = true;

  const locale = readStoredLocale();
  const darkMode = readStoredDarkMode();
  const lowBandwidth = readStoredLowBandwidth();

  applyAuthDomClasses(darkMode, lowBandwidth);
  useAuthStore.setState({ locale, darkMode, lowBandwidth });

  syncPreferencesForUser(useAuthStore.getState().user?.id ?? null);
}

/** Reset for unit tests. */
export function __resetClientHydrationForTests(): void {
  hydrated = false;
}
