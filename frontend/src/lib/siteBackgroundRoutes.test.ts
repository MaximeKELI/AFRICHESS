import { describe, expect, it } from "vitest";
import { shouldShowSiteBackground } from "./siteBackgroundRoutes";

describe("shouldShowSiteBackground", () => {
  it("hides on home page", () => {
    expect(shouldShowSiteBackground("/")).toBe(false);
    expect(shouldShowSiteBackground(null)).toBe(false);
  });

  it("shows on play and profile settings", () => {
    expect(shouldShowSiteBackground("/play")).toBe(true);
    expect(shouldShowSiteBackground("/profile")).toBe(true);
  });

  it("hides on public pages and other profiles", () => {
    expect(shouldShowSiteBackground("/leaderboard")).toBe(false);
    expect(shouldShowSiteBackground("/login")).toBe(false);
    expect(shouldShowSiteBackground("/profile/maxime")).toBe(false);
  });
});
