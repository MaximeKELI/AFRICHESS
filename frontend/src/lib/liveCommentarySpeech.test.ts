import { describe, expect, it } from "vitest";
import { selectLiveCommentsToSpeak } from "@/lib/liveCommentarySpeech";

function c(text: string, moveNumber = 1) {
  return { text, san: "e4", byAi: true, moveNumber };
}

describe("selectLiveCommentsToSpeak", () => {
  it("skips backlog when hydrating a resumed game", () => {
    const fresh = [c("a", 1), c("b", 1), c("c", 2), c("d", 2), c("e", 3)];
    const result = selectLiveCommentsToSpeak(fresh, 10, false);
    expect(result.skipSpeech).toBe(true);
    expect(result.toSpeak).toEqual([]);
    expect(result.primed).toBe(true);
  });

  it("speaks both comments on a fresh opening ply", () => {
    const fresh = [c("Bon départ.", 1), c("Je réponds.", 1)];
    const result = selectLiveCommentsToSpeak(fresh, 2, false);
    expect(result.skipSpeech).toBe(false);
    expect(result.toSpeak).toHaveLength(2);
    expect(result.primed).toBe(true);
  });

  it("speaks only the latest when catching up mid-game", () => {
    const fresh = [c("un", 5), c("deux", 5), c("trois", 6), c("quatre", 6)];
    const result = selectLiveCommentsToSpeak(fresh, 12, true);
    expect(result.skipSpeech).toBe(false);
    expect(result.toSpeak).toHaveLength(1);
    expect(result.toSpeak[0].text).toBe("quatre");
  });

  it("speaks up to two new comments in normal flow", () => {
    const fresh = [c("Coach.", 4), c("IA.", 4)];
    const result = selectLiveCommentsToSpeak(fresh, 8, true);
    expect(result.skipSpeech).toBe(false);
    expect(result.toSpeak.map((x) => x.text)).toEqual(["Coach.", "IA."]);
  });

  it("returns skip when nothing is fresh", () => {
    const result = selectLiveCommentsToSpeak([], 4, true);
    expect(result.skipSpeech).toBe(true);
    expect(result.toSpeak).toEqual([]);
  });
});
