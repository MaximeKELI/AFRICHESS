import type { MoveComment } from "@/lib/chessDisplay";
import { speakComment, unlockAiSpeech } from "@/lib/aiSpeech";
import { selectLiveCommentsToSpeak } from "@/lib/liveCommentarySpeech";

const spokenCommentKeys = new Set<string>();
let liveSpeechPrimed = false;

function commentSpeechKey(comment: MoveComment): string {
  return `${comment.moveNumber}|${comment.san}|${comment.text}`;
}

/** Réinitialiser entre deux parties. */
export function resetLiveMoveSpeech() {
  spokenCommentKeys.clear();
  liveSpeechPrimed = false;
}

/**
 * Lit à voix haute les nouveaux commentaires live dès qu’ils apparaissent dans l’état
 * (réponse HTTP, poll async, merge delta). Indépendant du panneau React.
 */
export function speakLiveMoveComments(
  comments: MoveComment[] | undefined,
  enabled: boolean
): void {
  if (!enabled || !comments?.length) return;

  const fresh = comments.filter(
    (c) => c.text.trim() && !spokenCommentKeys.has(commentSpeechKey(c))
  );
  if (!fresh.length) return;

  const decision = selectLiveCommentsToSpeak(fresh, comments.length, liveSpeechPrimed);
  liveSpeechPrimed = decision.primed;

  if (decision.skipSpeech) {
    for (const c of fresh) spokenCommentKeys.add(commentSpeechKey(c));
    return;
  }

  const dropped = fresh.slice(0, Math.max(0, fresh.length - decision.toSpeak.length));
  for (const c of dropped) spokenCommentKeys.add(commentSpeechKey(c));

  const toSpeak = decision.toSpeak;
  if (!toSpeak.length) return;

  unlockAiSpeech();
  toSpeak.forEach((comment, index) => {
    spokenCommentKeys.add(commentSpeechKey(comment));
    void speakComment(comment.text, {
      byAi: comment.byAi,
      enabled: true,
      forceUnlock: true,
      interrupt: index === 0,
    });
  });
}
