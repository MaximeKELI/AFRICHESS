import type { ApiMove } from "@/lib/chessDisplay";

export interface GameMoveDelta {
  id?: string;
  fen?: string;
  status?: string;
  result?: string;
  termination_reason?: string;
  move_count?: number;
  white_time_ms?: number;
  black_time_ms?: number;
  increment_ms?: number;
  new_moves?: ApiMove[];
  delta?: boolean;
  game_over?: boolean;
  comments_pending?: boolean;
  draw_claim?: string;
}

function moveKey(move: ApiMove): string {
  return `${move.move_number}:${move.played_by_white ? "w" : "b"}`;
}

/** Fusionne les coups (mise à jour commentaire ou ajout). */
export function mergeApiMoves(existing: ApiMove[], incoming: ApiMove[]): ApiMove[] {
  const map = new Map(existing.map((move) => [moveKey(move), move]));
  for (const move of incoming) {
    map.set(moveKey(move), move);
  }
  return [...map.values()].sort(
    (a, b) => a.move_number - b.move_number || Number(a.played_by_white) - Number(b.played_by_white)
  );
}

/** Applique une réponse delta move sur l'état partie existant. */
export function applyMoveDelta<T extends { moves?: ApiMove[] }>(
  prev: T,
  delta: GameMoveDelta
): T & GameMoveDelta {
  const moves =
    delta.delta && delta.new_moves?.length
      ? mergeApiMoves(prev.moves ?? [], delta.new_moves)
      : prev.moves;

  return {
    ...prev,
    ...delta,
    moves,
  };
}
