import { describe, expect, it } from "vitest";
import { buildStatsPdfLabels } from "./buildLabels";

const t = (key: string) => key;

describe("buildStatsPdfLabels", () => {
  it("returns all required label keys", () => {
    const labels = buildStatsPdfLabels(t, "fr");
    expect(labels.brand).toBe("AFRICHESS");
    expect(labels.coverSubtitle).toBe("stats.pdf.coverSubtitle");
    expect(labels.sectionSummary).toBe("stats.table.summary");
    expect(labels.generatedAt).toBeTruthy();
  });
});
