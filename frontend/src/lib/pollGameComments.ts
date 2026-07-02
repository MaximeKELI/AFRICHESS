import { gamesApi } from "@/lib/api";
import type { ApiMove } from "@/lib/chessDisplay";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Nombre de coups sans commentaire (partie vs IA). */
export function movesMissingComments(moves: ApiMove[] | undefined): number {
  if (!moves?.length) return 0;
  return moves.filter((move) => !move.comment?.trim()).length;
}

/** Au moins un coup récent attend encore son commentaire. */
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
  const maxAttempts = opts?.maxAttempts ?? 120;
  const intervalMs = opts?.intervalMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (typeof document !== "undefined" && document.hidden) {
      await sleep(Math.max(intervalMs, 3000));
      continue;
    }
    await sleep(intervalMs);
    try {
      const { data } = await gamesApi.get(gameId);
      onUpdate(data as Record<string, unknown>);
      if (movesMissingComments(data.moves as ApiMove[] | undefined) === 0) {
        return;
      }
    } catch {
      /* retry */
    }
  }
}
