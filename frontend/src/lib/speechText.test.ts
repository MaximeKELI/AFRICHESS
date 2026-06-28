import { describe, expect, it } from "vitest";
import { normalizeSpeechText, splitSpeechChunks } from "@/lib/speechText";

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
