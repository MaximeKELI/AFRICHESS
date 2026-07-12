import { describe, expect, it } from "vitest";
import {
  isPremiumBrowserVoice,
  isRoboticVoice,
  pickFrenchVoice,
  voiceScore,
} from "@/lib/ttsVoice";

describe("ttsVoice", () => {
  it("flags espeak and local robotic voices", () => {
    expect(isRoboticVoice({ name: "eSpeak French", lang: "fr", localService: true })).toBe(true);
    expect(isRoboticVoice({ name: "RHVoice", lang: "fr", localService: true })).toBe(true);
    expect(
      isRoboticVoice({ name: "Google français", lang: "fr-FR", localService: false })
    ).toBe(false);
  });

  it("scores Google remote French highest", () => {
    const google = { name: "Google français", lang: "fr-FR", localService: false };
    const espeak = { name: "eSpeak French", lang: "fr", localService: true };
    expect(voiceScore(google)).toBeGreaterThan(100);
    expect(voiceScore(espeak)).toBeLessThanOrEqual(8);
  });

  it("pickFrenchVoice ignores espeak even if it is the only French voice", () => {
    const picked = pickFrenchVoice([
      { name: "eSpeak French", lang: "fr", localService: true },
      { name: "English US", lang: "en-US", localService: false },
    ]);
    expect(picked?.name).toBe("English US");
  });

  it("pickFrenchVoice prefers Google over generic French local", () => {
    const picked = pickFrenchVoice([
      { name: "French", lang: "fr-FR", localService: true },
      { name: "Google français", lang: "fr-FR", localService: false },
    ]);
    expect(picked?.name).toBe("Google français");
  });

  it("isPremiumBrowserVoice requires score >= 90", () => {
    expect(
      isPremiumBrowserVoice({ name: "Google français", lang: "fr-FR", localService: false })
    ).toBe(true);
    expect(
      isPremiumBrowserVoice({ name: "Microsoft Paul Online (Natural)", lang: "fr-FR", localService: false })
    ).toBe(true);
    expect(isPremiumBrowserVoice({ name: "French", lang: "fr-FR", localService: true })).toBe(false);
    expect(isPremiumBrowserVoice({ name: "eSpeak French", lang: "fr", localService: true })).toBe(false);
  });
});
