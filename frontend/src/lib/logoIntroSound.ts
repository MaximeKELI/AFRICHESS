/**
 * Son « pion posé » — page d’accueil uniquement.
 *
 * Autoplay avec son est souvent bloqué. Après un geste, on reprend un
 * AudioContext et on joue un buffer (fiable sur Safari/Chrome).
 */

const MOVE_MP3 = "/sounds/themes/standard/move.mp3";
const MOVE_OGG = "/sounds/themes/standard/move.ogg";

let playedThisLoad = false;
let audioCtx: AudioContext | null = null;
let moveBuffer: AudioBuffer | null = null;
let loadingBuffer: Promise<AudioBuffer | null> | null = null;

function pickSrc(): string {
  if (typeof window === "undefined") return MOVE_MP3;
  const probe = document.createElement("audio");
  const oggOk =
    typeof probe.canPlayType === "function" &&
    probe.canPlayType('audio/ogg; codecs="vorbis"') !== "";
  return oggOk ? MOVE_OGG : MOVE_MP3;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

async function loadMoveBuffer(): Promise<AudioBuffer | null> {
  if (moveBuffer) return moveBuffer;
  if (loadingBuffer) return loadingBuffer;
  const ctx = getCtx();
  if (!ctx) return null;

  loadingBuffer = (async () => {
    try {
      const res = await fetch(pickSrc());
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      moveBuffer = await ctx.decodeAudioData(raw.slice(0));
      return moveBuffer;
    } catch {
      return null;
    } finally {
      loadingBuffer = null;
    }
  })();

  return loadingBuffer;
}

export function resetLogoLandSoundForNewPageLoad(): void {
  playedThisLoad = false;
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  void loadMoveBuffer();
  // Précharge aussi via HTMLAudio (cache HTTP)
  const a = new Audio(pickSrc());
  a.preload = "auto";
  a.load();
}

/** Débloque AudioContext (à appeler dans un geste utilisateur). */
export function unlockLogoLandAudio(): void {
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

function playBuffer(): boolean {
  const ctx = getCtx();
  if (!ctx || !moveBuffer) return false;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.buffer = moveBuffer;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    playedThisLoad = true;
    return true;
  } catch {
    return false;
  }
}

function playHtmlAudio(): void {
  const audio = new Audio(pickSrc());
  audio.volume = 1;
  audio.muted = false;
  const p = audio.play();
  if (p !== undefined && typeof p.then === "function") {
    void p.then(
      () => {
        playedThisLoad = true;
      },
      () => {
        /* ignore — le geste reprendra */
      }
    );
  } else {
    playedThisLoad = true;
  }
}

function playThud(): void {
  const ctx = getCtx();
  if (!ctx) return;
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
    playedThisLoad = true;
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(kick).catch(() => {});
  } else {
    kick();
  }
}

/** Autoplay (souvent bloqué). */
export function playLogoLandSound(): void {
  if (typeof window === "undefined" || playedThisLoad) return;
  if (playBuffer()) return;
  playHtmlAudio();
}

/**
 * Lecture depuis un geste (pointerdown). Débloque le contexte puis joue.
 * Fiable sur Safari iOS / Chrome.
 */
export function playLogoLandSoundFromGesture(): void {
  if (typeof window === "undefined" || playedThisLoad) return;
  unlockLogoLandAudio();

  if (playBuffer()) return;

  const audio = new Audio(pickSrc());
  audio.volume = 1;
  const p = audio.play();
  playedThisLoad = true;
  if (p !== undefined && typeof p.then === "function") {
    void p.catch(() => {
      playedThisLoad = false;
      playThud();
    });
  }
}

export function hasPlayedLogoLandSound(): boolean {
  return playedThisLoad;
}

/** Sonde : le navigateur autorise-t-il l’autoplay avec son ? */
export async function canAutoplayLogoSound(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const probe = new Audio(MOVE_MP3);
  probe.volume = 0.01;
  try {
    await probe.play();
    probe.pause();
    probe.currentTime = 0;
    return true;
  } catch {
    return false;
  }
}
