/** Paliers ELO : 0–500, 500–1000, puis par tranches de 500. */

export const AI_LEVELS = [
  {
    elo: 250,
    label: "Débutant",
    range: "0 – 500 ELO",
    description: "Très facile — idéal pour découvrir",
  },
  {
    elo: 750,
    label: "Novice",
    range: "500 – 1000 ELO",
    description: "Adversaire débutant confirmé",
  },
  {
    elo: 1250,
    label: "Amateur",
    range: "1000 – 1500 ELO",
    description: "Niveau club local",
  },
  {
    elo: 1750,
    label: "Intermédiaire",
    range: "1500 – 2000 ELO",
    description: "Bon joueur amateur",
  },
  {
    elo: 2250,
    label: "Confirmé",
    range: "2000 – 2500 ELO",
    description: "Joueur de tournoi",
  },
  {
    elo: 2750,
    label: "Expert",
    range: "2500 – 3000 ELO",
    description: "Très fort, peu d'erreurs",
  },
  {
    elo: 3250,
    label: "Maître",
    range: "3000 – 3500 ELO",
    description: "Niveau maître",
  },
  {
    elo: 4000,
    label: "Élite",
    range: "3500+ ELO",
    description: "Force moteur / super GM",
  },
] as const;

export type AiLevelElo = (typeof AI_LEVELS)[number]["elo"];

export const MIN_AI_ELO = 100;
export const MAX_AI_ELO = 5000;

export function isAiLevelElo(elo: number): elo is AiLevelElo {
  return AI_LEVELS.some((l) => l.elo === elo);
}

export function normalizeToPreset(elo: number): AiLevelElo {
  let best: AiLevelElo = AI_LEVELS[0].elo;
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
    beginner: 250,
    intermediate: 1250,
    advanced: 1750,
    expert: 2250,
    master: 3250,
  };
  return map[levelId ?? "intermediate"] ?? 1250;
}
