export const CHESS_LEVELS = [
  { id: "beginner", label: "Débutant", labelEn: "Beginner", elo: 800, description: "Je découvre les échecs" },
  { id: "intermediate", label: "Intermédiaire", labelEn: "Intermediate", elo: 1200, description: "Je connais les règles et quelques ouvertures" },
  { id: "advanced", label: "Avancé", labelEn: "Advanced", elo: 1600, description: "Je joue régulièrement en club ou en ligne" },
  { id: "expert", label: "Expert", labelEn: "Expert", elo: 2000, description: "Je participe à des tournois" },
  { id: "master", label: "Maître", labelEn: "Master", elo: 2200, description: "Niveau compétition nationale" },
] as const;

export type ChessLevelId = (typeof CHESS_LEVELS)[number]["id"];

export const AVATARS = [
  { id: "avatar-1", src: "/avatars/avatar-1.png", name: "Amara" },
  { id: "avatar-2", src: "/avatars/avatar-2.png", name: "Kwame" },
  { id: "avatar-3", src: "/avatars/avatar-3.png", name: "Moussa" },
  { id: "avatar-4", src: "/avatars/avatar-4.png", name: "Zara" },
  { id: "avatar-5", src: "/avatars/avatar-5.png", name: "David" },
  { id: "avatar-6", src: "/avatars/avatar-6.png", name: "Nia" },
  { id: "avatar-7", src: "/avatars/avatar-7.png", name: "Kofi" },
  { id: "avatar-8", src: "/avatars/avatar-8.png", name: "Amina" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export function getAvatarSrc(avatarId?: string | null): string {
  const found = AVATARS.find((a) => a.id === avatarId);
  return found?.src ?? AVATARS[0].src;
}

export function getLevelElo(levelId?: string | null): number {
  const found = CHESS_LEVELS.find((l) => l.id === levelId);
  return found?.elo ?? 1200;
}
