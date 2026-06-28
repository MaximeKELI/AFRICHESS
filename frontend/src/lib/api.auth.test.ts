import { describe, expect, it, vi, beforeEach } from "vitest";
import Cookies from "js-cookie";
import axios from "axios";
import { refreshAuthTokens } from "./api";

vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    create: vi.fn(() => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    })),
  },
}));

vi.mock("@/lib/cookies", () => ({
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  handleSessionExpired: vi.fn(),
}));

describe("refreshAuthTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores rotated refresh token from backend", async () => {
    const { setAccessToken, setRefreshToken } = await import("@/lib/cookies");
    vi.mocked(Cookies.get).mockReturnValue("old-refresh" as never);
    vi.mocked(axios.post).mockResolvedValue({
      data: { access: "new-access", refresh: "new-refresh" },
    });

    const ok = await refreshAuthTokens();

    expect(ok).toBe(true);
    expect(setAccessToken).toHaveBeenCalledWith("new-access");
    expect(setRefreshToken).toHaveBeenCalledWith("new-refresh");
  });

  it("returns false when no refresh cookie", async () => {
    vi.mocked(Cookies.get).mockReturnValue(undefined as never);
    expect(await refreshAuthTokens()).toBe(false);
  });
});
