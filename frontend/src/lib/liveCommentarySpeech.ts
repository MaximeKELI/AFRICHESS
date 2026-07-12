import type { MoveComment } from "@/lib/chessDisplay";

/**
 * Quels commentaires live lire à voix haute.
 * - reprise / backlog (>2 nouveaux d'un coup, pas encore amorcé) : silence
 * - retard (>2 nouveaux en cours de partie) : uniquement le dernier
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

  // Reprise de partie : beaucoup de commentaires déjà là
  if (!alreadyPrimed && totalCommentCount > 2 && fresh.length === totalCommentCount) {
    return { skipSpeech: true, toSpeak: [], primed: true };
  }

  const toSpeak = fresh.length > 2 ? fresh.slice(-1) : fresh.slice(-2);
  return { skipSpeech: false, toSpeak, primed: true };
}
