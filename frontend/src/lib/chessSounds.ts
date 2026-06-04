/**
 * Sons de coups — fichiers MP3/OGG (thème Lichess LISP, voir public/sounds/README.md).
 * Repli Web Audio si le navigateur ne charge pas les fichiers.
 */

export type ChessSoundType = "move" | "capture" | "check" | "castle";

const SOUND_PATHS: Record<ChessSoundType, { mp3: string; ogg: string }> = {
  move: { mp3: "/sounds/move.mp3", ogg: "/sounds/move.ogg" },
  capture: { mp3: "/sounds/capture.mp3", ogg: "/sounds/capture.ogg" },
  check: { mp3: "/sounds/check.mp3", ogg: "/sounds/check.ogg" },
  castle: { mp3: "/sounds/castle.mp3", ogg: "/sounds/castle.ogg" },
};

const VOLUME = 0.75;
const audioCache = new Map<ChessSoundType, HTMLAudioElement>();
let useFileSounds = true;
let preloaded = false;

function createAudio(type: ChessSoundType): HTMLAudioElement {
  const { mp3, ogg } = SOUND_PATHS[type];
  const audio = new Audio();
  audio.volume = VOLUME;
  audio.preload = "auto";

  const canOgg =
    typeof audio.canPlayType === "function" &&
    audio.canPlayType('audio/ogg; codecs="vorbis"') !== "";
  audio.src = canOgg ? ogg : mp3;

  audio.addEventListener(
    "error",
    () => {
      if (audio.src.endsWith(".ogg")) {
        audio.src = mp3;
        audio.load();
        return;
      }
      useFileSounds = false;
    },
    { once: true }
  );

  return audio;
}

function getAudio(type: ChessSoundType): HTMLAudioElement {
  let audio = audioCache.get(type);
  if (!audio) {
    audio = createAudio(type);
    audioCache.set(type, audio);
  }
  return audio;
}

/** Précharge les sons (appeler après un geste utilisateur). */
export function preloadChessSounds() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  (Object.keys(SOUND_PATHS) as ChessSoundType[]).forEach((type) => {
    const a = getAudio(type);
    a.load();
  });
}

function playFileSound(type: ChessSoundType) {
  const base = getAudio(type);
  const node = base.cloneNode(true) as HTMLAudioElement;
  node.volume = VOLUME;
  node.currentTime = 0;
  void node.play().catch(() => {
    useFileSounds = false;
    playSyntheticSound(type);
  });
}

/* --- Repli synthétique --- */

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
  volume = 0.15,
  type: OscillatorType = "sine"
) {
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

function playSyntheticSound(type: ChessSoundType) {
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

export function playChessSound(type: ChessSoundType, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  preloadChessSounds();
  if (useFileSounds) {
    playFileSound(type);
  } else {
    playSyntheticSound(type);
  }
}

export function soundForMove(flags: string): ChessSoundType {
  if (flags.includes("c")) return "capture";
  if (flags.includes("+") || flags.includes("#")) return "check";
  if (flags.includes("k") || flags.includes("q")) return "castle";
  return "move";
}
