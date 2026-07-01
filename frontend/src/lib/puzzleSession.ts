export interface PuzzleSessionEntry {
  puzzleId: number;
  rating: number;
  themes: string[];
  difficulty: string;
  solved: boolean;
  wrongAttempts: number;
  timeSeconds: number;
  usedHint: boolean;
}

export interface PuzzleSessionRecap {
  solved: number;
  failed: number;
  total: number;
  avgTimeSeconds: number;
  themeCounts: Record<string, number>;
  failedPuzzles: { puzzleId: number; themes: string[]; rating: number }[];
  perfectStreak: number;
  totalWrongAttempts: number;
}

export class PuzzleSessionTracker {
  private entries: PuzzleSessionEntry[] = [];
  private wrongByPuzzle = new Map<number, number>();
  private perfectStreak = 0;
  private lastPuzzleHadWrong = false;

  reset() {
    this.entries = [];
    this.wrongByPuzzle.clear();
    this.perfectStreak = 0;
    this.lastPuzzleHadWrong = false;
  }

  recordWrong(puzzleId: number) {
    const n = (this.wrongByPuzzle.get(puzzleId) ?? 0) + 1;
    this.wrongByPuzzle.set(puzzleId, n);
    this.lastPuzzleHadWrong = true;
    return n;
  }

  getWrongCount(puzzleId: number): number {
    return this.wrongByPuzzle.get(puzzleId) ?? 0;
  }

  hasEntry(puzzleId: number): boolean {
    return this.entries.some((e) => e.puzzleId === puzzleId);
  }

  shouldOfferHint(puzzleId: number, threshold = 1): boolean {
    return this.getWrongCount(puzzleId) >= threshold;
  }

  recordSolve(entry: Omit<PuzzleSessionEntry, "solved"> & { solved?: boolean }) {
    const solved = entry.solved !== false;
    if (solved && !this.lastPuzzleHadWrong) {
      this.perfectStreak += 1;
    } else if (solved) {
      this.perfectStreak = 1;
    } else {
      this.perfectStreak = 0;
    }
    this.lastPuzzleHadWrong = false;
    this.wrongByPuzzle.delete(entry.puzzleId);
    this.entries.push({ ...entry, solved });
  }

  /** Évite un double comptage client + API pour le même puzzle. */
  recordSolveOnce(entry: Omit<PuzzleSessionEntry, "solved"> & { solved?: boolean }): boolean {
    if (this.entries.some((e) => e.puzzleId === entry.puzzleId)) return false;
    this.recordSolve(entry);
    return true;
  }

  /** Corrige le bilan si l'API rejette un puzzle déjà compté côté client. */
  reviseOutcome(puzzleId: number, solved: boolean) {
    const entry = this.entries.find((e) => e.puzzleId === puzzleId);
    if (!entry || entry.solved === solved) return;
    entry.solved = solved;
    if (!solved) {
      this.perfectStreak = 0;
    }
  }

  recordFail(entry: Omit<PuzzleSessionEntry, "solved">) {
    this.perfectStreak = 0;
    this.entries.push({ ...entry, solved: false });
  }

  getPerfectStreak() {
    return this.perfectStreak;
  }

  getSolvedCount() {
    return this.entries.filter((e) => e.solved).length;
  }

  buildRecap(): PuzzleSessionRecap {
    const solvedEntries = this.entries.filter((e) => e.solved);
    const failed = this.entries.filter((e) => !e.solved);
    const themeCounts: Record<string, number> = {};
    for (const e of solvedEntries) {
      for (const th of e.themes) {
        themeCounts[th] = (themeCounts[th] ?? 0) + 1;
      }
    }
    const times = solvedEntries.map((e) => e.timeSeconds);
    const avgTimeSeconds = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
    return {
      solved: solvedEntries.length,
      failed: failed.length,
      total: this.entries.length,
      avgTimeSeconds,
      themeCounts,
      failedPuzzles: failed.map((e) => ({
        puzzleId: e.puzzleId,
        themes: e.themes,
        rating: e.rating,
      })),
      perfectStreak: this.perfectStreak,
      totalWrongAttempts: Array.from(this.wrongByPuzzle.values()).reduce((a, b) => a + b, 0),
    };
  }
}
