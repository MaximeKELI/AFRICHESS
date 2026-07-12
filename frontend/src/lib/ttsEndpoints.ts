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
 * WAV (espeak) = secours robotique seulement.
 * Si une voix humaine navigateur est dispo, on ne doit PAS préférer le WAV
 * (sinon l’utilisateur entend humain + robot en parallèle / en alternance).
 */
export function shouldPreferWavTts(hasHumanBrowserVoice = false): boolean {
  return !hasHumanBrowserVoice;
}
