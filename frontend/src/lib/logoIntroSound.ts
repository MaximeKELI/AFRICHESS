/**
 * Son « pion posé » — impact auto du logo + rejeu au clic sur le logo.
 */

const MOVE_MP3 = "/sounds/themes/standard/move.mp3";
const MOVE_OGG = "/sounds/themes/standard/move.ogg";

let audioCtx: AudioContext | null = null;
let moveBuffer: AudioBuffer | null = null;
let loadingBuffer: Promise<AudioBuffer | null> | null = null;
/** Atterrissage auto bloqué → jouer au prochain geste (hors clic logo). */
let pendingLandSound = false;
let lastPlayAt = 0;

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
  pendingLandSound = false;
}

export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  const warm = new Audio(pickSrc());
  warm.preload = "auto";
  warm.load();
  void loadMoveBuffer();
}

export function unlockLogoLandAudio(): void {
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

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

function playFreshHtml(): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(pickSrc());
    audio.volume = 1;
    audio.muted = false;
    audio.preload = "auto";
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const attempt = () => {
      const p = audio.play();
      if (p !== undefined && typeof p.then === "function") {
        void p.then(
          () => finish(true),
          () => finish(false)
        );
      } else {
        finish(true);
      }
    };

    if (audio.readyState >= 2) {
      attempt();
    } else {
      audio.addEventListener("canplaythrough", attempt, { once: true });
      audio.load();
      window.setTimeout(attempt, 280);
    }
  });
}

async function playAudible(): Promise<boolean> {
  const now = Date.now();
  if (now - lastPlayAt < 160) return true;
  lastPlayAt = now;

  if (playBufferIfRunning()) return true;
  if (await playFreshHtml()) return true;
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  if (playBufferIfRunning()) return true;
  playThud();
  return ctx?.state === "running";
}

/**
 * Impact à l’atterrissage (autoplay).
 * Si le navigateur bloque : marque un son en attente pour le prochain geste.
 */
export function playLogoLandSound(): void {
  if (typeof window === "undefined") return;
  void playAudible().then((ok) => {
    if (!ok) pendingLandSound = true;
  });
}

/** Rejeu libre au clic sur le logo. */
export function replayLogoLandSound(): void {
  if (typeof window === "undefined") return;
  pendingLandSound = false;
  unlockLogoLandAudio();
  const ctx = getCtx();
  const go = () => {
    void playAudible();
  };
  if (ctx?.state === "suspended") {
    void ctx.resume().then(go).catch(go);
  } else {
    go();
  }
}

/**
 * À brancher sur le 1er pointerdown du document :
 * joue le son d’atterrissage si l’autoplay l’avait manqué.
 */
export function flushPendingLogoLandSound(): void {
  if (!pendingLandSound) return;
  pendingLandSound = false;
  unlockLogoLandAudio();
  const ctx = getCtx();
  const go = () => {
    void playAudible();
  };
  if (ctx?.state === "suspended") {
    void ctx.resume().then(go).catch(go);
  } else {
    go();
  }
}
