/** Emotes thématiques échecs pour le chat en partie */

export interface ChessEmote {
  id: string;
  emoji: string;
  labelFr: string;
  labelEn: string;
}

export const CHESS_EMOTES: ChessEmote[] = [
  { id: "pawn", emoji: "♟️", labelFr: "Pion", labelEn: "Pawn" },
  { id: "knight", emoji: "♞", labelFr: "Cavalier", labelEn: "Knight" },
  { id: "bishop", emoji: "♝", labelFr: "Fou", labelEn: "Bishop" },
  { id: "rook", emoji: "♜", labelFr: "Tour", labelEn: "Rook" },
  { id: "queen", emoji: "♛", labelFr: "Dame", labelEn: "Queen" },
  { id: "king", emoji: "♚", labelFr: "Roi", labelEn: "King" },
  { id: "check", emoji: "‼️", labelFr: "Échec", labelEn: "Check" },
  { id: "mate", emoji: "🏆", labelFr: "Mat", labelEn: "Checkmate" },
  { id: "think", emoji: "🤔", labelFr: "Réflexion", labelEn: "Thinking" },
  { id: "gg", emoji: "🤝", labelFr: "Belle partie", labelEn: "Good game" },
  { id: "fire", emoji: "🔥", labelFr: "Feu", labelEn: "Fire" },
  { id: "clap", emoji: "👏", labelFr: "Bravo", labelEn: "Applause" },
];

/** Vérifie si le message est une emote seule (affichage agrandi) */
export function isEmoteOnlyMessage(content: string): boolean {
  const trimmed = content.trim();
  return CHESS_EMOTES.some((e) => e.emoji === trimmed);
}
