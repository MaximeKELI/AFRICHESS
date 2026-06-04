const KEY = "africhess_puzzle_streak";

export function getPuzzleStreak(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(KEY) || 0);
}

export function recordPuzzleSolved(solved: boolean): number {
  const prev = getPuzzleStreak();
  const next = solved ? prev + 1 : 0;
  localStorage.setItem(KEY, String(next));
  return next;
}
