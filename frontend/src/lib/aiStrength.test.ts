import { describe, expect, it } from "vitest";
import { resolveAiPlayMode } from "./aiStrength";

describe("resolveAiPlayMode", () => {
  it("maps classical to rapid for AI games", () => {
    expect(resolveAiPlayMode("classical")).toBe("rapid");
  });

  it("keeps bullet blitz rapid", () => {
    expect(resolveAiPlayMode("blitz")).toBe("blitz");
    expect(resolveAiPlayMode("bullet")).toBe("bullet");
    expect(resolveAiPlayMode("rapid")).toBe("rapid");
  });

  it("falls back to blitz", () => {
    expect(resolveAiPlayMode("unknown")).toBe("blitz");
  });
});
