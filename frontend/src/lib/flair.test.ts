import { describe, expect, it } from "vitest";
import { FLAIR_OPTIONS, isValidFlair } from "./flair";

describe("flair", () => {
  it("valide les emojis autorisés", () => {
    expect(isValidFlair("")).toBe(true);
    expect(isValidFlair(null)).toBe(true);
    expect(isValidFlair("🦁")).toBe(true);
    expect(isValidFlair("invalid")).toBe(false);
  });

  it("a une option sans flair", () => {
    expect(FLAIR_OPTIONS[0].emoji).toBe("");
  });
});
