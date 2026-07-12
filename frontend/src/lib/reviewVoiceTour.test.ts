import { describe, expect, it } from "vitest";
import { planReviewVoiceAutoStart } from "@/lib/reviewVoiceTour";

describe("planReviewVoiceAutoStart", () => {
  it("starts voice + auto tour when analysis has moves", () => {
    expect(
      planReviewVoiceAutoStart({
        moveCount: 12,
        alreadyStarted: false,
        hasSummary: true,
      })
    ).toEqual({
      enableVoice: true,
      enableAutoTour: true,
      speakSummaryFirst: true,
    });
  });

  it("skips summary speech when none is available", () => {
    expect(
      planReviewVoiceAutoStart({
        moveCount: 4,
        alreadyStarted: false,
        hasSummary: false,
      })
    ).toMatchObject({ speakSummaryFirst: false, enableAutoTour: true });
  });

  it("does not restart if already started or empty", () => {
    expect(
      planReviewVoiceAutoStart({
        moveCount: 10,
        alreadyStarted: true,
        hasSummary: true,
      })
    ).toBeNull();
    expect(
      planReviewVoiceAutoStart({
        moveCount: 0,
        alreadyStarted: false,
        hasSummary: true,
      })
    ).toBeNull();
  });
});
