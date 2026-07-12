import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MoveComment } from "@/lib/chessDisplay";

const speakComment = vi.fn(() => Promise.resolve());
const unlockAiSpeech = vi.fn();

vi.mock("@/lib/aiSpeech", () => ({
  speakComment: (...args: unknown[]) => speakComment(...args),
  unlockAiSpeech: (...args: unknown[]) => unlockAiSpeech(...args),
}));

function comments(list: Array<Partial<MoveComment> & Pick<MoveComment, "text" | "san">>): MoveComment[] {
  return list.map((c, i) => ({
    moveNumber: c.moveNumber ?? i + 1,
    san: c.san,
    text: c.text,
    byAi: c.byAi ?? false,
  }));
}

describe("speakLiveMoveComments", () => {
  beforeEach(async () => {
    speakComment.mockClear();
    unlockAiSpeech.mockClear();
    vi.resetModules();
    const mod = await import("@/lib/speakLiveMoveComments");
    mod.resetLiveMoveSpeech();
  });

  it("speaks up to two new comments for a ply", async () => {
    const { speakLiveMoveComments } = await import("@/lib/speakLiveMoveComments");
    speakLiveMoveComments(
      comments([
        { moveNumber: 1, san: "e4", text: "Bon départ.", byAi: false },
        { moveNumber: 1, san: "e5", text: "Je réponds.", byAi: true },
      ]),
      true
    );

    expect(unlockAiSpeech).toHaveBeenCalled();
    expect(speakComment).toHaveBeenCalledTimes(2);
    expect(speakComment.mock.calls[0][0]).toBe("Bon départ.");
    expect(speakComment.mock.calls[0][1]).toMatchObject({ byAi: false, interrupt: true });
    expect(speakComment.mock.calls[1][0]).toBe("Je réponds.");
    expect(speakComment.mock.calls[1][1]).toMatchObject({ byAi: true, interrupt: false });
  });

  it("speaks when comments arrive after an empty first update (poll path)", async () => {
    const { speakLiveMoveComments } = await import("@/lib/speakLiveMoveComments");
    speakLiveMoveComments([], true);
    speakLiveMoveComments(undefined, true);
    expect(speakComment).not.toHaveBeenCalled();

    speakLiveMoveComments(
      comments([{ moveNumber: 2, san: "Nf3", text: "Développement.", byAi: false }]),
      true
    );
    expect(speakComment).toHaveBeenCalledTimes(1);
    expect(speakComment.mock.calls[0][0]).toBe("Développement.");
  });

  it("does not re-speak the same comments", async () => {
    const { speakLiveMoveComments } = await import("@/lib/speakLiveMoveComments");
    const list = comments([
      { moveNumber: 2, san: "Nf3", text: "Développement.", byAi: false },
    ]);
    speakLiveMoveComments(list, true);
    speakLiveMoveComments(list, true);
    expect(speakComment).toHaveBeenCalledTimes(1);
  });

  it("on backlog/resume speaks only the latest comment", async () => {
    const { speakLiveMoveComments } = await import("@/lib/speakLiveMoveComments");
    speakLiveMoveComments(
      comments([
        { moveNumber: 1, san: "e4", text: "Un.", byAi: false },
        { moveNumber: 1, san: "e5", text: "Deux.", byAi: true },
        { moveNumber: 2, san: "Nf3", text: "Trois.", byAi: false },
        { moveNumber: 2, san: "Nc6", text: "Quatre.", byAi: true },
      ]),
      true
    );
    expect(speakComment).toHaveBeenCalledTimes(1);
    expect(speakComment.mock.calls[0][0]).toBe("Quatre.");
  });

  it("is a no-op when disabled or without comments", async () => {
    const { speakLiveMoveComments } = await import("@/lib/speakLiveMoveComments");
    speakLiveMoveComments(comments([{ san: "e4", text: "x" }]), false);
    speakLiveMoveComments(comments([{ san: "e4", text: "   " }]), true);
    expect(speakComment).not.toHaveBeenCalled();
  });
});
