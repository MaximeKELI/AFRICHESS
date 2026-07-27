import {
  buildGameDisplayFromFen,
  buildGameDisplayFromMoves,
  type ApiMove,
  type GameDisplayState,
} from "@/lib/chessDisplay";

/** Nombre de demi-coups (plies) dans la liste API. */
export function totalPlies(moves: ApiMove[] | undefined | null): number {
  return moves?.length ?? 0;
}

/**
 * Affiche la position après `ply` demi-coups (0 = départ).
 * `ply === null` ou `ply >= length` → position live.
 */
export function displayAtPly(
  moves: ApiMove[] | undefined | null,
  ply: number | null,
  liveFen = "start"
): GameDisplayState {
  const list = moves ?? [];
  if (ply == null || ply >= list.length) {
    if (!list.length) return buildGameDisplayFromFen(liveFen);
    return buildGameDisplayFromMoves("start", list);
  }
  if (ply <= 0) return buildGameDisplayFromFen("start");
  const ordered = [...list].sort((a, b) => {
    if (a.move_number !== b.move_number) return a.move_number - b.move_number;
    if (a.played_by_white === b.played_by_white) return 0;
    return a.played_by_white ? -1 : 1;
  });
  return buildGameDisplayFromMoves("start", ordered.slice(0, ply));
}

/** Index de demi-coup (1-based) pour la case blanche / noire d'une rangée. */
export function plyForMoveCell(moveNumber: number, color: "w" | "b"): number {
  return color === "w" ? moveNumber * 2 - 1 : moveNumber * 2;
}
