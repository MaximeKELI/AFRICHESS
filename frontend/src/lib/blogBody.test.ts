import { describe, expect, it } from "vitest";
import { insertDiagramMarker, parseBlogBody } from "./blogBody";

describe("blogBody", () => {
  it("parse texte et diagrammes", () => {
    const body = "Intro\n\n[diagram:rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1]\n\nFin";
    const segs = parseBlogBody(body);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ type: "text", content: "Intro\n\n" });
    expect(segs[1].type).toBe("diagram");
    expect(segs[2]).toEqual({ type: "text", content: "\n\nFin" });
  });

  it("insère un marqueur diagramme", () => {
    const fen = "8/8/8/8/8/8/8/8 w - - 0 1";
    expect(insertDiagramMarker("", fen)).toBe(`[diagram:${fen}]`);
  });
});
