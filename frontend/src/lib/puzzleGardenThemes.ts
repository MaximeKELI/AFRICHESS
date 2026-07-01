export type PuzzleGardenThemeId = "savanna" | "forest" | "night" | "aurora";

export interface PuzzleGardenTheme {
  id: PuzzleGardenThemeId;
  labelKey: string;
  unlockKey: string;
  cssClass: string;
}

export const PUZZLE_GARDEN_THEMES: PuzzleGardenTheme[] = [
  { id: "savanna", labelKey: "puzzles.garden.theme.savanna", unlockKey: "puzzles.garden.unlock.default", cssClass: "puzzle-garden-theme-savanna" },
  { id: "forest", labelKey: "puzzles.garden.theme.forest", unlockKey: "puzzles.garden.unlock.forest", cssClass: "puzzle-garden-theme-forest" },
  { id: "night", labelKey: "puzzles.garden.theme.night", unlockKey: "puzzles.garden.unlock.night", cssClass: "puzzle-garden-theme-night" },
  { id: "aurora", labelKey: "puzzles.garden.theme.aurora", unlockKey: "puzzles.garden.unlock.aurora", cssClass: "puzzle-garden-theme-aurora" },
];

export interface ThemeUnlockContext {
  lifetimeSolved: number;
  dailyStreak: number;
  sessionPerfectStreak: number;
  completedFullSet: boolean;
}

export function isThemeUnlocked(id: PuzzleGardenThemeId, ctx: ThemeUnlockContext): boolean {
  switch (id) {
    case "savanna":
      return true;
    case "forest":
      return ctx.lifetimeSolved >= 25;
    case "night":
      return ctx.dailyStreak >= 3;
    case "aurora":
      return ctx.completedFullSet || ctx.sessionPerfectStreak >= 5;
    default:
      return false;
  }
}

export function newlyUnlockedThemes(
  prev: ThemeUnlockContext,
  next: ThemeUnlockContext
): PuzzleGardenThemeId[] {
  return PUZZLE_GARDEN_THEMES.map((t) => t.id).filter(
    (id) => !isThemeUnlocked(id, prev) && isThemeUnlocked(id, next)
  );
}
