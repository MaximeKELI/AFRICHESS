import { normalizeToPreset } from "@/lib/aiStrength";

export const CHESS_LEVELS = [
  { id: "beginner", label: "Débutant", labelEn: "Beginner", elo: 800, description: "Je découvre les échecs" },
  { id: "intermediate", label: "Intermédiaire", labelEn: "Intermediate", elo: 1200, description: "Je connais les règles et quelques ouvertures" },
  { id: "advanced", label: "Avancé", labelEn: "Advanced", elo: 1600, description: "Je joue régulièrement en club ou en ligne" },
  { id: "expert", label: "Expert", labelEn: "Expert", elo: 2000, description: "Je participe à des tournois" },
  { id: "master", label: "Maître", labelEn: "Master", elo: 2200, description: "Niveau compétition nationale" },
] as const;

export type ChessLevelId = (typeof CHESS_LEVELS)[number]["id"];

/** Portraits des adversaires IA (pas le profil joueur). */
export const AI_AVATARS = [
  { id: "avatar-1", src: "/avatars/avatar-1.png", name: "Amara" },
  { id: "avatar-2", src: "/avatars/avatar-2.png", name: "Kwame" },
  { id: "avatar-3", src: "/avatars/avatar-3.png", name: "Moussa" },
  { id: "avatar-4", src: "/avatars/avatar-4.png", name: "Zara" },
  { id: "avatar-5", src: "/avatars/avatar-5.png", name: "David" },
  { id: "avatar-6", src: "/avatars/avatar-6.png", name: "Nia" },
  { id: "avatar-7", src: "/avatars/avatar-7.png", name: "Kofi" },
  { id: "avatar-8", src: "/avatars/avatar-8.png", name: "Amina" },
] as const;

export type AiAvatarId = (typeof AI_AVATARS)[number]["id"];

/** Un portrait IA fixe par palier de force (Débutant → Élite). */
export const AI_LEVEL_AVATAR_IDS: Record<number, AiAvatarId> = {
  250: "avatar-1",  // Débutant — Amara
  750: "avatar-2",  // Novice — Kwame
  1250: "avatar-3", // Amateur — Moussa
  1750: "avatar-4", // Intermédiaire — Zara
  2250: "avatar-5", // Confirmé — David
  2750: "avatar-6", // Expert — Nia
  3250: "avatar-7", // Maître — Kofi
  4000: "avatar-8", // Élite — Amina
};

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAiAvatarSrc(id?: AiAvatarId | string | null): string {
  const found = AI_AVATARS.find((a) => a.id === id);
  return found?.src ?? AI_AVATARS[0].src;
}

/** Portrait IA du palier correspondant (Débutant, Novice, … Élite). */
export function pickAiAvatar(elo?: number | null) {
  const preset = normalizeToPreset(elo ?? 1250);
  const id = AI_LEVEL_AVATAR_IDS[preset] ?? "avatar-1";
  return AI_AVATARS.find((a) => a.id === id) ?? AI_AVATARS[0];
}

export function aiAvatarForLevelElo(levelElo: number) {
  const id = AI_LEVEL_AVATAR_IDS[levelElo] ?? "avatar-1";
  return AI_AVATARS.find((a) => a.id === id) ?? AI_AVATARS[0];
}

export function getUserAvatarUrl(avatar?: string | null): string | null {
  return resolveMediaUrl(avatar);
}

export function userInitials(displayName?: string | null, username?: string): string {
  const base = (displayName || username || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export function getLevelElo(levelId?: string | null): number {
  const found = CHESS_LEVELS.find((l) => l.id === levelId);
  return found?.elo ?? 1200;
}

/** @deprecated Utiliser aiStrength.ts */
export function difficultyToElo(difficulty: number): number {
  const d = Math.min(20, Math.max(1, difficulty));
  return Math.round(100 + ((5000 - 100) * (d - 1)) / 19);
}
