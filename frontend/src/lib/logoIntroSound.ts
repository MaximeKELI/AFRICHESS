/**
 * Son « pion posé » — page d’accueil uniquement.
 *
 * Les navigateurs bloquent l’autoplay avec son sans geste utilisateur.
 * On tente à l’impact du logo ; si refusé, le premier clic/touche joue le son
 * (play() dans la pile du geste = activation conservée).
 */

const MOVE_OGG = "/sounds/themes/standard/move.ogg";
const MOVE_MP3 = "/sounds/themes/standard/move.mp3";

let playedThisLoad = false;
let unlockArmed = false;

function pickSrc(): string {
  if (typeof window === "undefined") return MOVE_MP3;
  const probe = document.createElement("audio");
  const oggOk =
    typeof probe.canPlayType === "function" &&
    probe.canPlayType('audio/ogg; codecs="vorbis"') !== "";
  return oggOk ? MOVE_OGG : MOVE_MP3;
}

function createAudio(): HTMLAudioElement {
  const audio = new Audio(pickSrc());
  audio.preload = "auto";
  audio.volume = 1;
  audio.setAttribute("playsinline", "true");
  return audio;
}

export function resetLogoLandSoundForNewPageLoad(): void {
  playedThisLoad = false;
  unlockArmed = false;
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  createAudio().load();
}

function playThudFallback(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const kick = () => {
      const t0 = ctx.currentTime;
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
    };
    if (ctx.state === "suspended") {
      void ctx.resume().then(kick).catch(() => {});
    } else {
      kick();
    }
  } catch {
    /* ignore */
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
    playLogoLandSoundFromGesture();
  };

  window.addEventListener("pointerdown", onGesture, { capture: true });
  window.addEventListener("keydown", onGesture, { capture: true });
  window.addEventListener("touchstart", onGesture, { capture: true });
}

/** Tentative autoplay (souvent bloquée). Si échec → arme le 1er geste. */
export function playLogoLandSound(): void {
  if (typeof window === "undefined" || playedThisLoad) return;

  const audio = createAudio();
  audio.volume = 1;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }

  const p = audio.play();
  if (p !== undefined && typeof p.then === "function") {
    void p.then(
      () => {
        playedThisLoad = true;
      },
      () => {
        // Ne pas marquer played — le geste doit pouvoir rejouer
        armGestureUnlock();
      }
    );
  } else {
    playedThisLoad = true;
  }
}

/** Lecture dans un geste utilisateur (fiable). */
export function playLogoLandSoundFromGesture(): void {
  if (typeof window === "undefined" || playedThisLoad) return;

  const audio = createAudio();
  audio.volume = 1;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }

  const p = audio.play();
  // Marquer après l’appel synchrone à play() (conserve l’activation)
  playedThisLoad = true;

  if (p !== undefined && typeof p.then === "function") {
    void p.catch(() => {
      playThudFallback();
    });
  }
}

export function ensureLogoLandSoundUnlock(): void {
  if (!playedThisLoad) armGestureUnlock();
}

export function hasPlayedLogoLandSound(): boolean {
  return playedThisLoad;
}
