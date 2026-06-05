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

/** Même logique que le backend : tranches de 500 ELO → palier IA. */
export function normalizeToPreset(elo: number): AiLevelElo {
  const e = Math.max(MIN_AI_ELO, Math.min(MAX_AI_ELO, elo));
  if (e < 500) return 250;
  if (e < 1000) return 750;
  if (e < 1500) return 1250;
  if (e < 2000) return 1750;
  if (e < 2500) return 2250;
  if (e < 3000) return 2750;
  if (e < 3500) return 3250;
  return 4000;
}

export function defaultAiEloForLevel(levelId?: string | null): AiLevelElo {
  const map: Record<string, AiLevelElo> = {
    beginner: 750,
    intermediate: 1250,
    advanced: 1750,
    expert: 2250,
    master: 3250,
  };
  return map[levelId ?? "intermediate"] ?? 1250;
}

/** Palier IA recommandé : classement réel en priorité, sinon niveau profil. */
export function defaultAiEloForUser(
  userElo?: number | null,
  levelId?: string | null
): AiLevelElo {
  if (userElo != null && userElo > 0) {
    return normalizeToPreset(userElo);
  }
  return defaultAiEloForLevel(levelId);
}
