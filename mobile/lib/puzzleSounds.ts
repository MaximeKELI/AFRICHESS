/** Sons puzzle — fanfare + buzz (synth Web Audio). */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(freq: number, duration: number, volume = 0.14, type: OscillatorType = "sine", delayMs = 0) {
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playPuzzleSuccess() {
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.16, 0.16, "triangle", i * 70));
  tone(1318.51, 0.35, 0.1, "sine", 420);
}

export function playPuzzleWrong() {
  tone(180, 0.12, 0.22, "sawtooth");
  tone(95, 0.22, 0.18, "sawtooth", 90);
}
