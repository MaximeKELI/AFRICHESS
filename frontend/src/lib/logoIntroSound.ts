/**
 * Son d’atterrissage du logo sur la page d’accueil uniquement.
 * Rejoué à chaque chargement / refresh de `/`.
 */

let sharedCtx: AudioContext | null = null;
let preloaded: HTMLAudioElement | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => undefined);
  }
  return sharedCtx;
}

/** Précharge le fichier dès l’arrivée sur l’accueil (avant l’impact). */
export function preloadLogoLandSound(): void {
  if (typeof window === "undefined") return;
  if (!preloaded) {
    preloaded = new Audio("/sounds/themes/standard/move.mp3");
    preloaded.preload = "auto";
    preloaded.volume = 1;
    preloaded.load();
  } else {
    preloaded.currentTime = 0;
  }
}

function playWoodThudSynthetic() {
  const ctx = getCtx();
  if (!ctx) return;

  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.12);
  oscGain.gain.setValueAtTime(0.55, t0);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.2);

  const bufferSize = Math.floor(ctx.sampleRate * 0.06);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.45, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.08);
}

function playFileMove(): Promise<boolean> {
  return new Promise((resolve) => {
    preloadLogoLandSound();
    const audio = (preloaded?.cloneNode(true) as HTMLAudioElement | null) ?? new Audio("/sounds/themes/standard/move.mp3");
    audio.volume = 1;
    audio.currentTime = 0;
    void audio
      .play()
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}

/** Joué à chaque refresh / chargement de la page d’accueil, au moment où le logo pose. */
export async function playLogoLandSound(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  playWoodThudSynthetic();
  const fileOk = await playFileMove();

  if (!fileOk) {
    const unlock = () => {
      playWoodThudSynthetic();
      void playFileMove();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
}
