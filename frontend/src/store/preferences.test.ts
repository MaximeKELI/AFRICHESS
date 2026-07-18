import { describe, expect, it, beforeEach } from "vitest";
import {
  BOARD_SIZE_DEFAULT,
  BOARD_SIZE_MAX,
  BOARD_SIZE_MIN,
  clampBoardSize,
  preferenceStorageKey,
  syncPreferencesForUser,
} from "./preferences";

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

describe("clampBoardSize", () => {
  it("borne la valeur dans [min, max]", () => {
    expect(clampBoardSize(BOARD_SIZE_MIN - 50)).toBe(BOARD_SIZE_MIN);
    expect(clampBoardSize(BOARD_SIZE_MAX + 50)).toBe(BOARD_SIZE_MAX);
    expect(clampBoardSize(100)).toBe(100);
  });

  it("retombe sur la valeur par défaut pour une entrée invalide", () => {
    expect(clampBoardSize(Number.NaN)).toBe(BOARD_SIZE_DEFAULT);
    expect(clampBoardSize(Number.POSITIVE_INFINITY)).toBe(BOARD_SIZE_DEFAULT);
  });
});

describe("boardSize preference", () => {
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

  it("défaut à 100 puis persiste et se réhydrate", async () => {
    const { usePreferencesStore } = await import("./preferences");
    expect(usePreferencesStore.getState().boardSize).toBe(BOARD_SIZE_DEFAULT);
    usePreferencesStore.getState().setBoardSize(120);
    expect(usePreferencesStore.getState().boardSize).toBe(120);
    expect(localStorage.getItem(preferenceStorageKey("board_size"))).toBe("120");
    syncPreferencesForUser(null);
    expect(usePreferencesStore.getState().boardSize).toBe(120);
  });

  it("borne les valeurs hors limites lors de l'écriture", async () => {
    const { usePreferencesStore } = await import("./preferences");
    usePreferencesStore.getState().setBoardSize(999);
    expect(usePreferencesStore.getState().boardSize).toBe(BOARD_SIZE_MAX);
    usePreferencesStore.getState().setBoardSize(10);
    expect(usePreferencesStore.getState().boardSize).toBe(BOARD_SIZE_MIN);
  });
});
