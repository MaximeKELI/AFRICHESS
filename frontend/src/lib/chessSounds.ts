/**
 * Sons de coups — fichiers MP3/OGG (Lichess), sons « killer » pour échec et mat.
 */

export type ChessSoundType =
  | "move"
  | "capture"
  | "check"
  | "checkmate"
  | "castle"
  | "draw";

const FILE_SOUND_PATHS = {
  move: { mp3: "/sounds/move.mp3", ogg: "/sounds/move.ogg" },
  capture: { mp3: "/sounds/capture.mp3", ogg: "/sounds/capture.ogg" },
  check: { mp3: "/sounds/check.mp3", ogg: "/sounds/check.ogg" },
  checkmate: { mp3: "/sounds/checkmate.mp3", ogg: "/sounds/checkmate.ogg" },
  castle: { mp3: "/sounds/castle.mp3", ogg: "/sounds/castle.ogg" },
} as const;

type FileSoundType = keyof typeof FILE_SOUND_PATHS;

const SOUND_PATHS: Record<FileSoundType, { mp3: string; ogg: string }> =
  FILE_SOUND_PATHS;

const VOLUME: Record<ChessSoundType, number> = {
  move: 0.75,
  capture: 0.75,
  castle: 0.75,
  check: 0.9,
  checkmate: 0.95,
  draw: 0.85,
};

const audioCache = new Map<FileSoundType, HTMLAudioElement>();
let useFileSounds = true;
let preloaded = false;

function createAudio(type: FileSoundType): HTMLAudioElement {
  const { mp3, ogg } = SOUND_PATHS[type];
  const audio = new Audio();
  audio.volume = VOLUME[type];
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

function getAudio(type: FileSoundType): HTMLAudioElement {
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
  (Object.keys(SOUND_PATHS) as FileSoundType[]).forEach((type) => {
    getAudio(type).load();
  });
}

function playFileSound(type: FileSoundType) {
  const base = getAudio(type);
  const node = base.cloneNode(true) as HTMLAudioElement;
  node.volume = VOLUME[type];
  node.currentTime = 0;
  void node.play().catch(() => {
    useFileSounds = false;
    playSyntheticSound(type);
  });
}

/* --- Repli synthétique « killer » --- */

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
  type: OscillatorType = "sine",
  delayMs = 0
) {
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
  osc.stop(start + duration);
}

/** Alerte percutante — échec */
function playKillerCheckSynthetic() {
  tone(90, 0.18, 0.32, "sawtooth");
  tone(740, 0.07, 0.28, "square", 25);
  tone(980, 0.09, 0.24, "triangle", 70);
  tone(520, 0.14, 0.2, "sawtooth", 130);
}

/** Fanfare grave — mat */
function playKillerMateSynthetic() {
  tone(50, 0.4, 0.4, "sine");
  tone(100, 0.22, 0.32, "sawtooth", 60);
  tone(196, 0.12, 0.22, "triangle", 120);
  tone(262, 0.14, 0.22, "triangle", 220);
  tone(330, 0.14, 0.2, "triangle", 320);
  tone(392, 0.28, 0.24, "triangle", 420);
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
      playKillerCheckSynthetic();
      break;
    case "checkmate":
      playKillerMateSynthetic();
      break;
    case "castle":
      tone(320, 0.05, 0.1);
      setTimeout(() => tone(380, 0.05, 0.1), 55);
      break;
    case "draw":
      playDrawWhistleSynthetic();
      break;
  }
}

/** Sifflet court — nulle par répétition */
function playDrawWhistleSynthetic() {
  tone(880, 0.12, 0.22, "sine");
  tone(660, 0.1, 0.18, "sine", 90);
  tone(880, 0.14, 0.2, "triangle", 180);
}

export function playChessSound(type: ChessSoundType, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  if (type === "draw") {
    playSyntheticSound("draw");
    return;
  }
  preloadChessSounds();
  if (useFileSounds) {
    playFileSound(type);
  } else {
    playSyntheticSound(type);
  }
}

/** chess.js v1 met +/# dans le SAN, pas dans flags (n, c, b, k, q…). */
export function soundForMove(flags: string, san?: string): ChessSoundType {
  if (san?.includes("#")) return "checkmate";
  if (san?.includes("+")) return "check";
  if (flags.includes("c")) return "capture";
  if (flags.includes("k") || flags.includes("q")) return "castle";
  return "move";
}

export function playDrawWhistle(enabled = true) {
  playChessSound("draw", enabled);
}
