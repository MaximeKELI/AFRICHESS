import { describe, expect, it, beforeEach } from "vitest";
import { preferenceStorageKey, syncPreferencesForUser } from "./preferences";

describe("preferenceStorageKey", () => {
  beforeEach(() => {
    syncPreferencesForUser(null);
  });

  it("scopes keys per user id", () => {
    syncPreferencesForUser(42);
    expect(preferenceStorageKey("board_background")).toBe("board_background:user:42");
    syncPreferencesForUser(99);
    expect(preferenceStorageKey("board_background")).toBe("board_background:user:99");
  });

  it("uses guest scope when logged out", () => {
    syncPreferencesForUser(null);
    expect(preferenceStorageKey("board_background")).toBe("board_background:guest");
  });
});

describe("soundTheme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    syncPreferencesForUser(null);
  });

  it("defaults to standard and persists selection", async () => {
    const { usePreferencesStore } = await import("./preferences");
    expect(usePreferencesStore.getState().soundTheme).toBe("standard");
    usePreferencesStore.getState().setSoundTheme("nes");
    expect(usePreferencesStore.getState().soundTheme).toBe("nes");
    expect(localStorage.getItem(preferenceStorageKey("sound_theme"))).toBe("nes");
    syncPreferencesForUser(null);
    expect(usePreferencesStore.getState().soundTheme).toBe("nes");
  });
});
