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
 * Toujours préférer le WAV pour les commentaires live.
 * speechSynthesis (Chromium/Firefox Linux) est robotique et se bloque après cancel().
 */
export function shouldPreferWavTts(): boolean {
  return true;
}
