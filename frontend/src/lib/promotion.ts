/** Détection de promotion : uniquement un pion atteignant sa dernière rangée. */

export interface BoardPiece {
  type: string; // "p" | "n" | "b" | "r" | "q" | "k"
  color: "w" | "b";
}

/**
 * Vrai seulement si la pièce est un PION atteignant sa rangée de promotion
 * (blanc → 8, noir → 1). Empêche d'ouvrir la promotion pour une tour, dame,
 * fou, cavalier ou roi qui atteint la dernière rangée.
 */
export function isPawnPromotion(
  piece: BoardPiece | null | undefined,
  to: string
): boolean {
  if (!piece || piece.type !== "p") return false;
  const rank = to[1];
  return (piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1");
}
