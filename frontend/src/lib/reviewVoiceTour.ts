/** Planification du démarrage auto de la revue vocale post-partie. */

export type ReviewVoiceTourPlan = {
  enableVoice: boolean;
  enableAutoTour: boolean;
  speakSummaryFirst: boolean;
};

/**
 * Après une partie, la revue doit démarrer seule (voix + parcours des coups),
 * sans attendre un clic sur « Revue vocale automatique ».
 * Retourne null si rien à démarrer (déjà lancé, ou pas de coups).
 */
export function planReviewVoiceAutoStart(input: {
  moveCount: number;
  alreadyStarted: boolean;
  hasSummary: boolean;
}): ReviewVoiceTourPlan | null {
  if (input.alreadyStarted || input.moveCount <= 0) return null;
  return {
    enableVoice: true,
    enableAutoTour: true,
    speakSummaryFirst: input.hasSummary,
  };
}
