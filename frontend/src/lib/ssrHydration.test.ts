import { describe, expect, it } from "vitest";
import { AUTH_SSR_DEFAULTS } from "@/store/auth";
import { DEFAULT_BOARD_BACKGROUND } from "@/lib/boardBackgrounds";
import { DEFAULT_BOARD_THEME } from "@/lib/boardThemes";
import { DEFAULT_SOUND_THEME } from "@/lib/soundThemes";

/**
 * Garde-fou : le HTML serveur et le 1er rendu client doivent utiliser les mêmes defaults
 * (sinon mismatch SVG — ex. Lune vs Soleil dans la navbar).
 */
describe("SSR hydration defaults alignment", () => {
  it("auth defaults are stable for server and first client render", () => {
    expect(AUTH_SSR_DEFAULTS.darkMode).toBe(false);
    expect(AUTH_SSR_DEFAULTS.locale).toBe("fr");
    expect(AUTH_SSR_DEFAULTS.lowBandwidth).toBe(false);
  });

  it("preferences defaults match read* fallbacks when storage empty", async () => {
    const { usePreferencesStore } = await import("@/store/preferences");
    const state = usePreferencesStore.getState();
    expect(state.boardTheme).toBe(DEFAULT_BOARD_THEME);
    expect(state.boardBackground).toBe(DEFAULT_BOARD_BACKGROUND);
    expect(state.soundTheme).toBe(DEFAULT_SOUND_THEME);
    expect(state.pieceSet).toBe("classic");
    expect(state.aiCommentsEnabled).toBe(true);
    expect(state.zenMode).toBe(false);
  });
});
