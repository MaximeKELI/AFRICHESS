import { gamesApi, type GameData } from "./api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function movesMissingComments(moves: GameData["moves"]): number {
  if (!moves?.length) return 0;
  return moves.filter((m) => !m.comment?.trim()).length;
}

/** Attend les commentaires IA async après un coup. */
export async function pollPendingMoveComments(
  gameId: string,
  onUpdate: (data: GameData) => void,
  opts?: { maxAttempts?: number; intervalMs?: number }
): Promise<void> {
  const maxAttempts = opts?.maxAttempts ?? 90;
  const intervalMs = opts?.intervalMs ?? 650;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(intervalMs);
    try {
      const { data } = await gamesApi.get(gameId);
      onUpdate(data);
      if (movesMissingComments(data.moves) === 0) return;
    } catch {
      /* retry */
    }
  }
}

export function latestComment(moves: GameData["moves"]): string | null {
  if (!moves?.length) return null;
  for (let i = moves.length - 1; i >= 0; i -= 1) {
    const text = moves[i].comment?.trim();
    if (text) return text;
  }
  return null;
}
