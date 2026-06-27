import { describe, expect, it } from "vitest";
import { CHESS_EMOTES, isEmoteOnlyMessage } from "./chessEmotes";

describe("chessEmotes", () => {
  it("contient au moins 10 emotes", () => {
    expect(CHESS_EMOTES.length).toBeGreaterThanOrEqual(10);
  });

  it("détecte un message emote seul", () => {
    expect(isEmoteOnlyMessage("🏆")).toBe(true);
    expect(isEmoteOnlyMessage("  🤝  ")).toBe(true);
    expect(isEmoteOnlyMessage("Belle partie !")).toBe(false);
  });
});
