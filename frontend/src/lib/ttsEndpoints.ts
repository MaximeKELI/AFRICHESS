/** Endpoints TTS — constantes testables (évite /game/tts/ 404). */

export const LOCAL_TTS_PATH = "/api/tts";

/** Chemin relatif à apiBase() (= .../api). Pluriel « games ». */
export const BACKEND_TTS_SUFFIX = "/games/tts/";

export function buildTtsUrls(apiBaseUrl: string): { local: string; backend: string } {
  const base = apiBaseUrl.replace(/\/$/, "");
  return {
    local: LOCAL_TTS_PATH,
    backend: `${base}${BACKEND_TTS_SUFFIX}`,
  };
}

/**
 * Toujours préférer le TTS serveur neural (edge-tts).
 * speechSynthesis Linux est souvent espeak robotique.
 */
export function shouldPreferNeuralTts(): boolean {
  return true;
}

/** @deprecated alias — le « WAV » serveur est désormais MP3 neural. */
export function shouldPreferWavTts(_hasHumanBrowserVoice = false): boolean {
  return shouldPreferNeuralTts();
}
