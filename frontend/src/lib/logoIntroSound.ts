/**
 * Son d’atterrissage du logo — pièce en bois posée sur l’échiquier.
 * Fichier standard + repli Web Audio (thud) si autoplay / fichier indisponible.
 */

let sharedCtx: AudioContext | null = null;

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

/** Bruit filtré + claquement grave = pion posé sur bois. */
function playWoodThudSynthetic() {
  const ctx = getCtx();
  if (!ctx) return;

  const t0 = ctx.currentTime;

  // Corps du thud (basse)
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

  // Attaque « bois » (bruit court)
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
    const audio = new Audio("/sounds/themes/standard/move.mp3");
    audio.volume = 1;
    audio.preload = "auto";
    const onOk = () => resolve(true);
    const onFail = () => resolve(false);
    audio.addEventListener("playing", onOk, { once: true });
    audio.addEventListener("error", onFail, { once: true });
    void audio.play().then(onOk).catch(onFail);
  });
}

export async function playLogoLandSound(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Toujours tenter le thud synthétique (fiable dès que le contexte audio est autorisé)
  playWoodThudSynthetic();

  const fileOk = await playFileMove();
  if (!fileOk) {
    // Autoplay bloqué : rejouer au premier geste
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
