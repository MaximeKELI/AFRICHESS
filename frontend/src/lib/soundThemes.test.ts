import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUND_THEME,
  getSoundTheme,
  isSoundThemeId,
  SOUND_THEMES,
  soundFilePaths,
} from "./soundThemes";

describe("soundThemes — catalogue Lichess + AFRICHESS", () => {
  it("inclut silent + thèmes fichier Lichess et packs supplémentaires", () => {
    const ids = SOUND_THEMES.map((t) => t.id);
    expect(ids).toEqual([
      "silent",
      "standard",
      "piano",
      "nes",
      "sfx",
      "futuristic",
      "lisp",
      "woodland",
      "robot",
      "music",
      "guitar",
      "energy",
      "crystal",
      "drums",
      "glass",
      "brass",
      "retro",
      "arena",
    ]);
    expect(DEFAULT_SOUND_THEME).toBe("standard");
  });

  it("valide les ids", () => {
    expect(isSoundThemeId("piano")).toBe(true);
    expect(isSoundThemeId("silent")).toBe(true);
    expect(isSoundThemeId("music")).toBe(true);
    expect(isSoundThemeId("guitar")).toBe(true);
    expect(isSoundThemeId("pentatonic")).toBe(false);
    expect(isSoundThemeId(null)).toBe(false);
  });

  it("silent n’a pas de fichiers ; standard pointe vers /sounds/themes/standard/", () => {
    expect(getSoundTheme("silent").folder).toBeNull();
    expect(soundFilePaths("silent", "move")).toBeNull();
    expect(soundFilePaths("standard", "move")).toEqual({
      mp3: "/sounds/themes/standard/move.mp3",
      ogg: "/sounds/themes/standard/move.ogg",
    });
    expect(soundFilePaths("nes", "capture")?.mp3).toBe("/sounds/themes/nes/capture.mp3");
    expect(soundFilePaths("music", "checkmate")?.ogg).toBe(
      "/sounds/themes/music/checkmate.ogg"
    );
  });
});
