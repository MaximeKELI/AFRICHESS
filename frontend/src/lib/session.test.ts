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
    vi.stubGlobal("window", {
      location: { pathname: "/play", href: "" },
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
    vi.unstubAllGlobals();
  });
});
