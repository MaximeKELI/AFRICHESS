import { describe, expect, it, beforeEach } from "vitest";
import {
  applyAuthDomClasses,
  readStoredDarkMode,
  readStoredLocale,
  readStoredLowBandwidth,
} from "@/lib/clientStorage";

describe("clientStorage SSR-safe reads", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        documentElement: {
          classList: {
            toggle: (_cls: string, _on: boolean) => undefined,
          },
        },
      },
    });
  });

  it("returns defaults when storage is empty (matches SSR initial render)", () => {
    expect(readStoredLocale()).toBe("fr");
    expect(readStoredDarkMode()).toBe(false);
    expect(readStoredLowBandwidth()).toBe(false);
  });

  it("reads persisted auth preferences after refresh", () => {
    localStorage.setItem("locale", "en");
    localStorage.setItem("theme", "dark");
    localStorage.setItem("lowBandwidth", "1");
    expect(readStoredLocale()).toBe("en");
    expect(readStoredDarkMode()).toBe(true);
    expect(readStoredLowBandwidth()).toBe(true);
  });

  it("applyAuthDomClasses toggles html classes", () => {
    const toggled: Array<[string, boolean]> = [];
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        documentElement: {
          classList: {
            toggle: (cls: string, on: boolean) => toggled.push([cls, on]),
          },
        },
      },
    });
    applyAuthDomClasses(true, false);
    expect(toggled).toContainEqual(["dark", true]);
    expect(toggled).toContainEqual(["low-bandwidth", false]);
  });
});

describe("auth store SSR defaults", () => {
  it("does not read localStorage during module init on server", async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    vi.resetModules();
    const { useAuthStore } = await import("@/store/auth");
    expect(useAuthStore.getState().darkMode).toBe(false);
    expect(useAuthStore.getState().locale).toBe("fr");
    expect(useAuthStore.getState().lowBandwidth).toBe(false);
    globalThis.window = originalWindow;
  });
});
