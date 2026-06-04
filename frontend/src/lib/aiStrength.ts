/** Niveaux IA sélectionnables (800 → 5000 ELO). */

export const AI_LEVELS = [
  { elo: 800, label: "Débutant", description: "Très facile — coups parfois aléatoires" },
  { elo: 1200, label: "Club", description: "Adversaire loisir régulier" },
  { elo: 1600, label: "Confirmé", description: "Bon niveau amateur" },
  { elo: 2000, label: "Expert", description: "Joueur de tournoi" },
  { elo: 2400, label: "Maître", description: "Très fort, peu d'erreurs" },
  { elo: 2800, label: "FM", description: "Maître FIDE" },
  { elo: 3200, label: "GM", description: "Grand maître" },
  { elo: 3800, label: "Super GM", description: "Élite mondiale" },
  { elo: 4500, label: "Moteur", description: "Force moteur, très dur" },
  { elo: 5000, label: "Monstre", description: "Quasi imbattable" },
] as const;

export type AiLevelElo = (typeof AI_LEVELS)[number]["elo"];

export const MIN_AI_ELO = 800;
export const MAX_AI_ELO = 5000;

export function isAiLevelElo(elo: number): elo is AiLevelElo {
  return AI_LEVELS.some((l) => l.elo === elo);
}

export function normalizeToPreset(elo: number): AiLevelElo {
  let best = AI_LEVELS[0].elo;
  let diff = Math.abs(elo - best);
  for (const level of AI_LEVELS) {
    const d = Math.abs(elo - level.elo);
    if (d < diff) {
      diff = d;
      best = level.elo;
    }
  }
  return best;
}

export function defaultAiEloForLevel(levelId?: string | null): AiLevelElo {
  const map: Record<string, AiLevelElo> = {
    beginner: 800,
    intermediate: 1200,
    advanced: 1600,
    expert: 2400,
    master: 3200,
  };
  return map[levelId ?? "intermediate"] ?? 1200;
}
