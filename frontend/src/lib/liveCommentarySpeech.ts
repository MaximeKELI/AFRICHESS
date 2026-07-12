import type { MoveComment } from "@/lib/chessDisplay";

/**
 * Quels commentaires live lire à voix haute.
 * - reprise / backlog : silence (éviter la rafale en fin de partie)
 * - retard (>2 nouveaux) : uniquement le dernier
 * - flux normal : jusqu'à 2 (coup joueur + réponse IA)
 */
export function selectLiveCommentsToSpeak<T extends Pick<MoveComment, "text">>(
  fresh: T[],
  totalCommentCount: number,
  alreadyPrimed: boolean
): { skipSpeech: boolean; toSpeak: T[]; primed: boolean } {
  if (!fresh.length) {
    return { skipSpeech: true, toSpeak: [], primed: alreadyPrimed };
  }

  if (!alreadyPrimed) {
    const isFreshGame = totalCommentCount <= 2 && fresh.length <= 2;
    if (!isFreshGame) {
      return { skipSpeech: true, toSpeak: [], primed: true };
    }
  }

  const toSpeak = fresh.length > 2 ? fresh.slice(-1) : fresh.slice(-2);
  return { skipSpeech: false, toSpeak, primed: true };
}
