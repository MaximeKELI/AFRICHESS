/**
 * Son « pion posé » — page d’accueil uniquement, à chaque refresh.
 * Les navigateurs bloquent l’autoplay sans geste : on tente à l’impact,
 * puis on force la lecture au premier clic/touche si besoin.
 */

const MOVE_SRC = "/sounds/themes/standard/move.mp3";

let audioEl: HTMLAudioElement | null = null;
let played = false;
let gestureBound = false;

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(MOVE_SRC);
    audioEl.preload = "auto";
    audioEl.volume = 1;
  }
  return audioEl;
}

export function resetLogoLandSoundForNewPageLoad(): void {
  played = false;
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  getAudio().load();
  bindGestureFallback();
}

function bindGestureFallback(): void {
  if (typeof window === "undefined" || gestureBound) return;
  gestureBound = true;

  const onGesture = () => {
    if (played) return;
    void playLogoLandSound();
  };

  // Tant que le son n’a pas joué, le prochain geste le déclenche
  window.addEventListener("pointerdown", onGesture, { capture: true });
  window.addEventListener("keydown", onGesture, { capture: true });
  window.addEventListener("touchstart", onGesture, { capture: true });
}

/** Joue le son de pièce (standard). Retourne true si la lecture a démarré. */
export async function playLogoLandSound(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (played) return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    played = true;
    return false;
  }

  const audio = getAudio();
  audio.volume = 1;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }

  try {
    await audio.play();
    played = true;
    return true;
  } catch {
    // Autoplay bloqué — le geste (bindGestureFallback) réessaiera
    bindGestureFallback();
    return false;
  }
}
