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
    const store = new Map<string, string>();
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: ls });
    Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
    syncPreferencesForUser(null);
  });

  it("defaults to standard and persists selection", async () => {
    const { usePreferencesStore } = await import("./preferences");
    usePreferencesStore.setState({ soundTheme: "standard" });
    expect(usePreferencesStore.getState().soundTheme).toBe("standard");
    usePreferencesStore.getState().setSoundTheme("nes");
    expect(usePreferencesStore.getState().soundTheme).toBe("nes");
    expect(localStorage.getItem(preferenceStorageKey("sound_theme"))).toBe("nes");
    syncPreferencesForUser(null);
    expect(usePreferencesStore.getState().soundTheme).toBe("nes");
  });

  it("accepte silent et woodland", async () => {
    const { usePreferencesStore } = await import("./preferences");
    usePreferencesStore.getState().setSoundTheme("silent");
    expect(usePreferencesStore.getState().soundTheme).toBe("silent");
    usePreferencesStore.getState().setSoundTheme("woodland");
    expect(usePreferencesStore.getState().soundTheme).toBe("woodland");
  });
});
