/** Flairs affichés à côté du pseudo (style Chess.com) */

export interface FlairOption {
  id: string;
  emoji: string;
  labelFr: string;
  labelEn: string;
}

export const FLAIR_OPTIONS: FlairOption[] = [
  { id: "none", emoji: "", labelFr: "Aucun", labelEn: "None" },
  { id: "lion", emoji: "🦁", labelFr: "Lion", labelEn: "Lion" },
  { id: "elephant", emoji: "🐘", labelFr: "Éléphant", labelEn: "Elephant" },
  { id: "baobab", emoji: "🌳", labelFr: "Baobab", labelEn: "Baobab" },
  { id: "drum", emoji: "🥁", labelFr: "Tambour", labelEn: "Drum" },
  { id: "star", emoji: "⭐", labelFr: "Étoile", labelEn: "Star" },
  { id: "crown", emoji: "👑", labelFr: "Couronne", labelEn: "Crown" },
  { id: "fire", emoji: "🔥", labelFr: "Feu", labelEn: "Fire" },
  { id: "rocket", emoji: "🚀", labelFr: "Fusée", labelEn: "Rocket" },
  { id: "puzzle", emoji: "🧩", labelFr: "Puzzle", labelEn: "Puzzle" },
];

const VALID_EMOJIS = new Set(FLAIR_OPTIONS.filter((f) => f.emoji).map((f) => f.emoji));

export function isValidFlair(value: string | null | undefined): boolean {
  if (!value) return true;
  return VALID_EMOJIS.has(value);
}

export function flairLabel(id: string, locale: string): string {
  const opt = FLAIR_OPTIONS.find((f) => f.id === id);
  if (!opt) return "";
  return locale === "fr" ? opt.labelFr : opt.labelEn;
}
