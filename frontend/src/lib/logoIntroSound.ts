/**
 * Son « pion posé » — page d’accueil (impact du logo + rejeu au clic).
 */

const MOVE_MP3 = "/sounds/themes/standard/move.mp3";
const MOVE_OGG = "/sounds/themes/standard/move.ogg";

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
  /* no-op de session — le rejeu est libre via replayLogoLandSound */
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  void loadMoveBuffer();
  const a = new Audio(pickSrc());
  a.preload = "auto";
  a.load();
}

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
    return true;
  } catch {
    return false;
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
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(kick).catch(() => {});
  } else {
    kick();
  }
}

function playHtmlAudio(): Promise<boolean> {
  const audio = new Audio(pickSrc());
  audio.volume = 1;
  audio.muted = false;
  const p = audio.play();
  if (p !== undefined && typeof p.then === "function") {
    return p.then(
      () => true,
      () => false
    );
  }
  return Promise.resolve(true);
}

/** Impact du logo (autoplay si le navigateur l’autorise). */
export function playLogoLandSound(): void {
  if (typeof window === "undefined") return;
  if (playBuffer()) return;
  void playHtmlAudio().then((ok) => {
    if (!ok) playThud();
  });
}

/**
 * Rejeu au clic sur le logo — toujours autorisé (geste utilisateur).
 * Peut aussi débloquer l’audio pour les prochains impacts autoplay.
 */
export function replayLogoLandSound(): void {
  if (typeof window === "undefined") return;
  unlockLogoLandAudio();
  if (playBuffer()) return;
  void playHtmlAudio().then((ok) => {
    if (!ok) playThud();
  });
}
