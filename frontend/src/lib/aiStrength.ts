/** Force IA : 800 → 5000 ELO (aligné backend). */

export const MIN_AI_ELO = 800;
export const MAX_AI_ELO = 5000;
export const AI_ELO_STEP = 50;

export const AI_ELO_PRESETS = [
  { elo: 800, label: "Débutant" },
  { elo: 1200, label: "Club" },
  { elo: 1600, label: "Confirmé" },
  { elo: 2000, label: "Expert" },
  { elo: 2400, label: "Maître" },
  { elo: 2800, label: "FM" },
  { elo: 3200, label: "GM" },
  { elo: 3800, label: "Super GM" },
  { elo: 4500, label: "Moteur" },
  { elo: 5000, label: "Monstre" },
] as const;

export function clampAiElo(elo: number): number {
  return Math.min(MAX_AI_ELO, Math.max(MIN_AI_ELO, Math.round(elo / AI_ELO_STEP) * AI_ELO_STEP));
}

export function eloStrengthLabel(elo: number): string {
  const e = clampAiElo(elo);
  if (e >= 4800) return "Quasi imbattable";
  if (e >= 4000) return "Super grand maître";
  if (e >= 3200) return "Grand maître";
  if (e >= 2400) return "Maître";
  if (e >= 2000) return "Expert";
  if (e >= 1600) return "Club";
  if (e >= 1200) return "Intermédiaire";
  return "Débutant";
}

export function defaultAiEloForLevel(levelId?: string | null): number {
  const map: Record<string, number> = {
    beginner: 900,
    intermediate: 1300,
    advanced: 1800,
    expert: 2400,
    master: 3000,
  };
  return clampAiElo(map[levelId ?? "intermediate"] ?? 1300);
}
