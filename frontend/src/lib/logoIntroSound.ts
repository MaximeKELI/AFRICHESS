/**
 * Son « pion posé » — page d’accueil uniquement.
 *
 * Les navigateurs bloquent l’autoplay avec son sans geste utilisateur.
 * Stratégie : tenter à l’impact du logo ; si refusé, jouer au premier
 * pointerdown/keydown (appel synchrone à play() pour conserver l’activation).
 */

const MOVE_SRC = "/sounds/themes/standard/Move.ogg";
const MOVE_SRC_FALLBACK = "/sounds/themes/standard/move.mp3";

let playedThisLoad = false;
let unlockArmed = false;
let cached: HTMLAudioElement | null = null;

function pickSrc(): string {
  if (typeof window === "undefined") return MOVE_SRC_FALLBACK;
  const probe = document.createElement("audio");
  const oggOk =
    typeof probe.canPlayType === "function" &&
    probe.canPlayType('audio/ogg; codecs="vorbis"') !== "";
  return oggOk ? MOVE_SRC : MOVE_SRC_FALLBACK;
}

function createAudio(): HTMLAudioElement {
  const audio = new Audio(pickSrc());
  audio.preload = "auto";
  audio.volume = 1;
  audio.setAttribute("playsinline", "true");
  return audio;
}

function getCached(): HTMLAudioElement {
  if (!cached) cached = createAudio();
  return cached;
}

export function resetLogoLandSoundForNewPageLoad(): void {
  playedThisLoad = false;
  unlockArmed = false;
  if (cached) {
    try {
      cached.pause();
      cached.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  getCached().load();
}

function playThudFallback(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    void resume.then(() => {
      const t0 = ctx.currentTime;
      // Impact bois court (repli si le fichier MP3/OGG échoue)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, t0);
      osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.08);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Joue le son immédiatement. À appeler aussi depuis un handler de geste
 * (onPointerDown) pour contourner l’autoplay.
 */
export function playLogoLandSound(): boolean {
  if (typeof window === "undefined") return false;
  if (playedThisLoad) return true;

  // Nouveau nœud à chaque lecture (évite les états « coincés » d’un seul Audio)
  const audio = createAudio();
  cached = audio;
  audio.volume = 1;
  audio.muted = false;

  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }

  const result = audio.play();
  if (result !== undefined && typeof result.then === "function") {
    void result.then(
      () => {
        playedThisLoad = true;
      },
      () => {
        // Autoplay / fichier : repli synthétique (marche surtout après geste)
        playThudFallback();
        playedThisLoad = true;
        armGestureUnlock();
      }
    );
  } else {
    playedThisLoad = true;
  }

  // Marque « tenté » pour ne pas spammer ; si play() a échoué en sync, arm unlock
  return true;
}

/** À brancher sur onPointerDown / onKeyDown de la home — activation utilisateur. */
export function playLogoLandSoundFromGesture(): void {
  if (playedThisLoad) return;
  playedThisLoad = false; // force une vraie lecture dans le geste
  const audio = createAudio();
  cached = audio;
  audio.volume = 1;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
  const p = audio.play();
  playedThisLoad = true;
  if (p !== undefined && typeof p.then === "function") {
    void p.catch(() => {
      playThudFallback();
    });
  } else {
    playThudFallback();
  }
}

function armGestureUnlock(): void {
  if (typeof window === "undefined" || unlockArmed || playedThisLoad) return;
  unlockArmed = true;

  const onGesture = () => {
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("keydown", onGesture, true);
    window.removeEventListener("touchstart", onGesture, true);
    unlockArmed = false;
    if (!playedThisLoad) playLogoLandSoundFromGesture();
  };

  window.addEventListener("pointerdown", onGesture, { capture: true });
  window.addEventListener("keydown", onGesture, { capture: true });
  window.addEventListener("touchstart", onGesture, { capture: true });
}

/** Après une tentative autoplay : si rien n’a joué, armer le geste. */
export function ensureLogoLandSoundUnlock(): void {
  if (playedThisLoad) return;
  armGestureUnlock();
}
