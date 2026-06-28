import { gamesApi } from "@/lib/api";
import type { ApiMove } from "@/lib/chessDisplay";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Coups récents sans commentaire (partie vs IA). */
export function recentMovesMissingComments(moves: ApiMove[] | undefined, expect = 2): boolean {
  if (!moves?.length) return false;
  const tail = moves.slice(-expect);
  return tail.some((move) => !move.comment?.trim());
}

/** Attend que les commentaires async arrivent puis rafraîchit l'état partie. */
export async function pollPendingMoveComments(
  gameId: string,
  onUpdate: (data: Record<string, unknown>) => void,
  opts?: { maxAttempts?: number; intervalMs?: number }
): Promise<void> {
  const maxAttempts = opts?.maxAttempts ?? 24;
  const intervalMs = opts?.intervalMs ?? 400;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(intervalMs);
    try {
      const { data } = await gamesApi.get(gameId);
      onUpdate(data as Record<string, unknown>);
      if (!recentMovesMissingComments(data.moves as ApiMove[] | undefined)) {
        return;
      }
    } catch {
      /* retry */
    }
  }
}
