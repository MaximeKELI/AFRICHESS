import { describe, expect, it, vi, beforeEach } from "vitest";
import Cookies from "js-cookie";
import { clearAuthCookies, handleSessionExpired } from "./session";

vi.mock("js-cookie", () => ({
  default: {
    remove: vi.fn(),
  },
}));

describe("session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears auth cookies", () => {
    clearAuthCookies();
    expect(Cookies.remove).toHaveBeenCalledWith("access_token");
    expect(Cookies.remove).toHaveBeenCalledWith("refresh_token");
  });

  it("dispatches session expired event in browser", () => {
    const listeners: Array<(e: Event) => void> = [];
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      setItem: (k: string, v: string) => storage.set(k, v),
      getItem: (k: string) => storage.get(k) ?? null,
      removeItem: (k: string) => storage.delete(k),
    });
    vi.stubGlobal("window", {
      location: { pathname: "/play", href: "", search: "?game=abc" },
      addEventListener: (name: string, fn: (e: Event) => void) => {
        if (name === "africhess:session-expired") listeners.push(fn);
      },
      dispatchEvent: () => {
        listeners.forEach((fn) => fn(new Event("africhess:session-expired")));
        return true;
      },
    });
    const handler = vi.fn();
    window.addEventListener("africhess:session-expired", handler);
    handleSessionExpired();
    expect(handler).toHaveBeenCalled();
    expect(storage.get("africhess:return-after-login")).toBe("/play?game=abc");
    vi.unstubAllGlobals();
  });
});
