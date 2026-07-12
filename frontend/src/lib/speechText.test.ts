import { describe, expect, it } from "vitest";
import {
  expandChessNotationForSpeech,
  normalizeSpeechText,
  sanToSpokenFrench,
  splitSpeechChunks,
} from "@/lib/speechText";

describe("splitSpeechChunks", () => {
  it("returns single chunk for short text", () => {
    expect(splitSpeechChunks("Bonjour le monde.")).toEqual(["Bonjour le monde."]);
  });

  it("splits long text on sentence boundaries", () => {
    const text =
      "Première phrase assez longue pour tester. Deuxième phrase également importante. Troisième phrase finale.";
    const chunks = splitSpeechChunks(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ")).toContain("Première");
    expect(chunks.join(" ")).toContain("finale.");
  });

  it("normalizes whitespace and caps length", () => {
    const long = "a".repeat(2000);
    expect(normalizeSpeechText(`  ${long}  `, 100).length).toBe(100);
  });
});

describe("sanToSpokenFrench", () => {
  it("reads castling and pieces in French", () => {
    expect(sanToSpokenFrench("O-O")).toContain("petit roque");
    expect(sanToSpokenFrench("O-O-O+")).toContain("grand roque");
    expect(sanToSpokenFrench("Nf3")).toMatch(/cavalier/i);
    expect(sanToSpokenFrench("exd5")).toMatch(/pion|prend/i);
    expect(sanToSpokenFrench("Qh5#")).toMatch(/dame|mat/i);
  });

  it("expands SAN inside coach sentences", () => {
    const out = expandChessNotationForSpeech("Beau coup : Nf3 développe une pièce.");
    expect(out).toMatch(/cavalier/i);
    expect(out).not.toMatch(/\bNf3\b/);
  });
});
