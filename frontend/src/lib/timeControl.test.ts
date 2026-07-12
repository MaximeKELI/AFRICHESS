import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_PRESET,
  formatTimeControlLabel,
  inferPresetFromMs,
  matchmakingTimeControl,
  playModeFromPreset,
  presetLabel,
  TIME_PRESETS,
} from "./timeControl";

describe("formatTimeControlLabel", () => {
  it("returns unlimited label when not timed", () => {
    expect(formatTimeControlLabel(false)).toBe("Sans limite");
  });

  it("formats preset label", () => {
    expect(formatTimeControlLabel(true, "3+2")).toBe("3+2");
  });

  it("uses default preset when timed without value", () => {
    expect(formatTimeControlLabel(true)).toBe(presetLabel(DEFAULT_TIME_PRESET));
  });
});

describe("playModeFromPreset", () => {
  it("maps bullet and blitz", () => {
    expect(playModeFromPreset("1+0")).toBe("bullet");
    expect(playModeFromPreset("3+2")).toBe("blitz");
  });

  it("maps classical and rapid for API ratings", () => {
    expect(playModeFromPreset("30+0")).toBe("classical");
    expect(playModeFromPreset("10+0")).toBe("rapid");
  });
});

describe("matchmakingTimeControl", () => {
  it("sends the requester-chosen preset (not locked to blitz)", () => {
    expect(matchmakingTimeControl(true, "10+0")).toBe("10+0");
    expect(matchmakingTimeControl(true, "30+0")).toBe("30+0");
    expect(matchmakingTimeControl(true, "1+0")).toBe("1+0");
  });

  it("omits time control for unlimited games", () => {
    expect(matchmakingTimeControl(false, "3+2")).toBeUndefined();
  });
});

describe("inferPresetFromMs", () => {
  it("detects 3+2 from milliseconds", () => {
    const p = TIME_PRESETS["3+2"];
    expect(inferPresetFromMs(p.baseMs, p.incrementMs)).toBe("3+2");
  });
});
