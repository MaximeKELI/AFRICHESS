import { describe, expect, it } from "vitest";
import {
  buildTtsUrls,
  LOCAL_TTS_PATH,
  BACKEND_TTS_SUFFIX,
  shouldPreferNeuralTts,
  shouldPreferWavTts,
} from "@/lib/ttsEndpoints";

describe("ttsEndpoints", () => {
  it("builds local /api/tts and plural /games/tts/ (never /game/tts/)", () => {
    const urls = buildTtsUrls("http://127.0.0.1:8000/api");
    expect(urls.local).toBe("/api/tts");
    expect(urls.backend).toBe("http://127.0.0.1:8000/api/games/tts/");
    expect(urls.backend).not.toContain("/api/game/tts");
    expect(LOCAL_TTS_PATH).toBe("/api/tts");
    expect(BACKEND_TTS_SUFFIX).toBe("/games/tts/");
  });

  it("strips trailing slash on api base", () => {
    expect(buildTtsUrls("http://127.0.0.1:8000/api/").backend).toBe(
      "http://127.0.0.1:8000/api/games/tts/"
    );
  });

  it("always prefers neural server TTS over browser/espeak", () => {
    expect(shouldPreferNeuralTts()).toBe(true);
    expect(shouldPreferWavTts(true)).toBe(true);
    expect(shouldPreferWavTts(false)).toBe(true);
  });
});
