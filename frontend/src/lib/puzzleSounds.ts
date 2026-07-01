/**
 * Sons puzzle — fanfare de réussite et buzz d'erreur (style Chess.com).
 * Synthèse Web Audio avec repli silencieux si low-bandwidth.
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(
  freq: number,
  duration: number,
  volume = 0.14,
  type: OscillatorType = "sine",
  delayMs = 0,
  attackMs = 8
) {
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + attackMs / 1000);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Fanfare ascendante + sparkle final */
function playSuccessSynthetic() {
  const melody = [
    { f: 392, d: 0.14, t: 0 },
    { f: 523.25, d: 0.14, t: 70 },
    { f: 659.25, d: 0.16, t: 140 },
    { f: 783.99, d: 0.18, t: 220 },
    { f: 1046.5, d: 0.28, t: 310 },
  ];
  melody.forEach(({ f, d, t }) => tone(f, d, 0.16, "triangle", t));
  tone(1318.51, 0.35, 0.1, "sine", 420);
  tone(1567.98, 0.4, 0.08, "sine", 480);
}

/** Buzz court + descente */
function playWrongSynthetic() {
  tone(180, 0.12, 0.22, "sawtooth");
  tone(140, 0.18, 0.2, "square", 40);
  tone(95, 0.22, 0.18, "sawtooth", 90);
}

/** Petit « tick » quand on passe au puzzle suivant */
function playAdvanceSynthetic() {
  tone(440, 0.06, 0.1, "sine");
  tone(554.37, 0.08, 0.09, "triangle", 50);
}

export function playPuzzleSuccess(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  playSuccessSynthetic();
}

export function playPuzzleWrong(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  playWrongSynthetic();
}

export function playPuzzleAdvance(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  playAdvanceSynthetic();
}

export function preloadPuzzleSounds() {
  getContext();
}
