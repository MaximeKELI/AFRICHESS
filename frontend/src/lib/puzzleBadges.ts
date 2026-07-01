export type PuzzleBadgeId =
  | "first_solve"
  | "streak_3"
  | "streak_5"
  | "streak_10"
  | "daily_7"
  | "rush_20"
  | "perfect_set"
  | "no_hint_master";

export interface PuzzleBadge {
  id: PuzzleBadgeId;
  labelKey: string;
  descKey: string;
  emoji: string;
}

export const PUZZLE_BADGES: PuzzleBadge[] = [
  { id: "first_solve", labelKey: "puzzles.badge.first", descKey: "puzzles.badge.first.desc", emoji: "🌱" },
  { id: "streak_3", labelKey: "puzzles.badge.streak3", descKey: "puzzles.badge.streak3.desc", emoji: "🔥" },
  { id: "streak_5", labelKey: "puzzles.badge.streak5", descKey: "puzzles.badge.streak5.desc", emoji: "⚡" },
  { id: "streak_10", labelKey: "puzzles.badge.streak10", descKey: "puzzles.badge.streak10.desc", emoji: "👑" },
  { id: "daily_7", labelKey: "puzzles.badge.daily7", descKey: "puzzles.badge.daily7.desc", emoji: "📅" },
  { id: "rush_20", labelKey: "puzzles.badge.rush20", descKey: "puzzles.badge.rush20.desc", emoji: "🏃" },
  { id: "perfect_set", labelKey: "puzzles.badge.perfect", descKey: "puzzles.badge.perfect.desc", emoji: "💎" },
  { id: "no_hint_master", labelKey: "puzzles.badge.nohint", descKey: "puzzles.badge.nohint.desc", emoji: "🧠" },
];

export interface BadgeCheckContext {
  sessionSolved: number;
  perfectStreak: number;
  dailyStreak: number;
  rushScore: number;
  completedFullSet: boolean;
  solvedWithoutHint: boolean;
  lifetimeSolved: number;
}

const STORAGE_KEY = "africhess_puzzle_badges";

function storageKey(userId: number | null): string {
  return userId != null ? `${STORAGE_KEY}:u${userId}` : `${STORAGE_KEY}:guest`;
}

export function loadUnlockedBadges(userId: number | null): Set<PuzzleBadgeId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as PuzzleBadgeId[]);
  } catch {
    return new Set();
  }
}

export function saveUnlockedBadges(userId: number | null, ids: Set<PuzzleBadgeId>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
}

export function evaluateNewBadges(
  ctx: BadgeCheckContext,
  already: Set<PuzzleBadgeId>
): PuzzleBadgeId[] {
  const earned: PuzzleBadgeId[] = [];
  const tryAdd = (id: PuzzleBadgeId, cond: boolean) => {
    if (cond && !already.has(id)) earned.push(id);
  };
  tryAdd("first_solve", ctx.lifetimeSolved >= 1 && ctx.sessionSolved === 1);
  tryAdd("streak_3", ctx.perfectStreak >= 3);
  tryAdd("streak_5", ctx.perfectStreak >= 5);
  tryAdd("streak_10", ctx.perfectStreak >= 10);
  tryAdd("daily_7", ctx.dailyStreak >= 7);
  tryAdd("rush_20", ctx.rushScore >= 20);
  tryAdd("perfect_set", ctx.completedFullSet);
  tryAdd("no_hint_master", ctx.solvedWithoutHint && ctx.perfectStreak >= 3);
  return earned;
}

export function badgeById(id: PuzzleBadgeId): PuzzleBadge | undefined {
  return PUZZLE_BADGES.find((b) => b.id === id);
}
