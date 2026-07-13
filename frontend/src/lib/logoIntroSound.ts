/**
 * Son « pion posé » — impact auto du logo + rejeu au clic.
 *
 * Important : ne jamais appeler buffer.start() sur un AudioContext encore
 * « suspended » (ça « réussit » sans son). L’autoplay passe par HTMLAudio.
 */

const MOVE_MP3 = "/sounds/themes/standard/move.mp3";
const MOVE_OGG = "/sounds/themes/standard/move.ogg";

let audioCtx: AudioContext | null = null;
let moveBuffer: AudioBuffer | null = null;
let loadingBuffer: Promise<AudioBuffer | null> | null = null;
let htmlAudio: HTMLAudioElement | null = null;

function pickSrc(): string {
  if (typeof window === "undefined") return MOVE_MP3;
  const probe = document.createElement("audio");
  const oggOk =
    typeof probe.canPlayType === "function" &&
    probe.canPlayType('audio/ogg; codecs="vorbis"') !== "";
  return oggOk ? MOVE_OGG : MOVE_MP3;
}

function getHtmlAudio(): HTMLAudioElement {
  if (!htmlAudio) {
    htmlAudio = new Audio(pickSrc());
    htmlAudio.preload = "auto";
    htmlAudio.volume = 1;
    htmlAudio.setAttribute("playsinline", "true");
  }
  return htmlAudio;
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
  if (htmlAudio) {
    try {
      htmlAudio.pause();
      htmlAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  getHtmlAudio().load();
  void loadMoveBuffer();
}

export function unlockLogoLandAudio(): void {
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/** Web Audio uniquement si le contexte est déjà running (sinon silence trompeur). */
function playBufferIfRunning(): boolean {
  const ctx = getCtx();
  if (!ctx || !moveBuffer || ctx.state !== "running") return false;
  try {
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
  if (!ctx || ctx.state !== "running") return;
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
}

function playViaHtmlElement(): Promise<boolean> {
  const audio = getHtmlAudio();
  audio.volume = 1;
  audio.muted = false;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
  const fresh = audio.cloneNode(true) as HTMLAudioElement;
  fresh.volume = 1;
  const p = fresh.play();
  if (p !== undefined && typeof p.then === "function") {
    return p.then(
      () => true,
      () => false
    );
  }
  return Promise.resolve(true);
}

/**
 * Impact auto à l’atterrissage.
 * Priorité HTMLAudio (autoplay MEI) — pas de Web Audio suspendu.
 */
export function playLogoLandSound(): void {
  if (typeof window === "undefined") return;
  void playViaHtmlElement().then((ok) => {
    if (ok) return;
    if (playBufferIfRunning()) return;
    playThud();
  });
}

/** Rejeu au clic sur le logo (geste → débloque le contexte). */
export function replayLogoLandSound(): void {
  if (typeof window === "undefined") return;
  unlockLogoLandAudio();

  const ctx = getCtx();
  const afterUnlock = () => {
    if (playBufferIfRunning()) return;
    void playViaHtmlElement().then((ok) => {
      if (!ok) playThud();
    });
  };

  if (ctx?.state === "suspended") {
    void ctx.resume().then(afterUnlock).catch(afterUnlock);
  } else {
    afterUnlock();
  }
}
