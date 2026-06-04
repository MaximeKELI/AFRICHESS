/** Sons de coups — Web Audio API (aucun fichier externe). */

export type ChessSoundType = "move" | "capture" | "check" | "castle";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(freq: number, duration: number, volume = 0.15, type: OscillatorType = "sine") {
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playChessSound(type: ChessSoundType, enabled = true) {
  if (!enabled) return;
  switch (type) {
    case "move":
      tone(280, 0.06, 0.12);
      break;
    case "capture":
      tone(180, 0.08, 0.18, "square");
      setTimeout(() => tone(220, 0.05, 0.1), 40);
      break;
    case "check":
      tone(520, 0.12, 0.2, "triangle");
      setTimeout(() => tone(640, 0.08, 0.15, "triangle"), 90);
      break;
    case "castle":
      tone(320, 0.05, 0.1);
      setTimeout(() => tone(380, 0.05, 0.1), 55);
      break;
  }
}

export function soundForMove(flags: string): ChessSoundType {
  if (flags.includes("c")) return "capture";
  if (flags.includes("+") || flags.includes("#")) return "check";
  if (flags.includes("k") || flags.includes("q")) return "castle";
  return "move";
}
