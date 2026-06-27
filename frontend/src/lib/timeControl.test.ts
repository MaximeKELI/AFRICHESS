import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_MINUTES,
  formatTimeControlLabel,
  TIME_MINUTES_OPTIONS,
} from "./timeControl";

describe("formatTimeControlLabel", () => {
  it("returns unlimited label when not timed", () => {
    expect(formatTimeControlLabel(false)).toBe("Sans limite");
  });

  it("uses default minutes when timed without value", () => {
    expect(formatTimeControlLabel(true)).toBe(`${DEFAULT_TIME_MINUTES} min`);
  });

  it("formats custom minutes", () => {
    expect(formatTimeControlLabel(true, 15)).toBe("15 min");
  });
});

describe("TIME_MINUTES_OPTIONS", () => {
  it("includes common presets", () => {
    expect(TIME_MINUTES_OPTIONS).toContain(5);
    expect(TIME_MINUTES_OPTIONS).toContain(30);
  });
});
