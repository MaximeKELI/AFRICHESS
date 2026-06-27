import { describe, expect, it } from "vitest";
import { buildStatsCsv } from "./statsExport";

const sampleData = {
  summary: { parties: 10, victoires: 5 },
  by_mode: [{ mode: "blitz", played: 8, win_rate: 50 }],
  vs_opponent: {
    human: { played: 6, won: 3, drawn: 1, lost: 2, win_rate: 50 },
    ai: { played: 4, won: 2, drawn: 0, lost: 2, win_rate: 50 },
  },
  by_color: {
    white: { played: 5, won: 3, drawn: 0, lost: 2, win_rate: 60 },
    black: { played: 5, won: 2, drawn: 1, lost: 2, win_rate: 40 },
  },
  by_termination: [],
  openings: [],
  ratings: {},
  rating_history: [],
  recent_form: [],
  activity: [],
};

describe("buildStatsCsv", () => {
  it("includes username and summary section", () => {
    const csv = buildStatsCsv(sampleData, "player1");
    expect(csv).toContain("player1");
    expect(csv).toContain("RÉSUMÉ");
    expect(csv).toContain("parties");
  });

  it("includes mode and opponent sections", () => {
    const csv = buildStatsCsv(sampleData, "player1");
    expect(csv).toContain("PAR CADENCE");
    expect(csv).toContain("ADVERSAIRE");
    expect(csv).toContain("humain");
  });
});
