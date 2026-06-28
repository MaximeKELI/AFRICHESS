import { describe, expect, it } from "vitest";
import {
  PROVISIONAL_GAMES_REQUIRED,
  formatElo,
  formatEloParen,
  isProvisionalRating,
  ratingForMode,
} from "./ratings";

describe("formatElo", () => {
  it("shows question mark for provisional ratings", () => {
    expect(formatElo(1200, true)).toBe("1200?");
    expect(formatElo(1200, false)).toBe("1200");
    expect(formatElo(null)).toBe("—");
  });
});

describe("formatEloParen", () => {
  it("wraps formatted elo in parentheses", () => {
    expect(formatEloParen(1500, true)).toBe("(1500?)");
    expect(formatEloParen(1500, false)).toBe("(1500)");
  });
});

describe("isProvisionalRating", () => {
  it("uses backend flag when present", () => {
    expect(isProvisionalRating({ mode: "blitz", elo: 1200, is_provisional: false })).toBe(false);
    expect(isProvisionalRating({ mode: "blitz", elo: 1200, is_provisional: true })).toBe(true);
  });

  it("falls back to games_count threshold", () => {
    expect(
      isProvisionalRating({ mode: "blitz", elo: 1200, games_count: PROVISIONAL_GAMES_REQUIRED - 1 })
    ).toBe(true);
    expect(
      isProvisionalRating({ mode: "blitz", elo: 1200, games_count: PROVISIONAL_GAMES_REQUIRED })
    ).toBe(false);
  });
});

describe("ratingForMode", () => {
  it("finds rating by mode", () => {
    const ratings = [
      { mode: "bullet", elo: 1100 },
      { mode: "blitz", elo: 1250 },
    ];
    expect(ratingForMode(ratings, "blitz")?.elo).toBe(1250);
    expect(ratingForMode(ratings, "rapid")).toBeUndefined();
  });
});
