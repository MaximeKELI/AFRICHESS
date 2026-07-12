import type { MoveComment } from "@/lib/chessDisplay";

/**
 * Quels commentaires live lire à voix haute.
 *
 * - Flux normal : jusqu'à 2 nouveaux (joueur + IA)
 * - Retard (>2 nouveaux) : uniquement le dernier
 * - Reprise / remount avec tout l'historique « fresh » : lire seulement le dernier
 *   (évite la rafale ET le silence total après Strict Mode)
 */
export function selectLiveCommentsToSpeak<T extends Pick<MoveComment, "text">>(
  fresh: T[],
  totalCommentCount: number,
  alreadyPrimed: boolean
): { skipSpeech: boolean; toSpeak: T[]; primed: boolean } {
  if (!fresh.length) {
    return { skipSpeech: true, toSpeak: [], primed: alreadyPrimed };
  }

  // Reprise de partie ou remount React : tout le fil arrive d'un coup
  if (!alreadyPrimed && fresh.length === totalCommentCount && totalCommentCount > 2) {
    return { skipSpeech: false, toSpeak: fresh.slice(-1), primed: true };
  }

  const toSpeak = fresh.length > 2 ? fresh.slice(-1) : fresh.slice(-2);
  return { skipSpeech: false, toSpeak, primed: true };
}
