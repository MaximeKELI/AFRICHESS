import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("TTS endpoint paths", () => {
  it("uses plural /games/tts/ for backend fallback (not /game/tts/)", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const file = fs.readFileSync(path.join(dir, "aiSpeech.ts"), "utf8");
    expect(file).toContain("${apiBase()}/games/tts/");
    expect(file).not.toContain("${apiBase()}/game/tts/");
  });
});
