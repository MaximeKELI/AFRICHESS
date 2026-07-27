/**
 * Sons de coups — thèmes Lichess (MP3/OGG) + repli Web Audio.
 */

import { Chess } from "chess.js";
import {
  DEFAULT_SOUND_THEME,
  soundFilePaths,
  type BoardSoundFile,
  type SoundThemeId,
} from "@/lib/soundThemes";

export type ChessSoundType =
  | "move"
  | "capture"
  | "check"
  | "checkmate"
  | "castle"
  | "draw";

type FileSoundType = BoardSoundFile;

const VOLUME: Record<ChessSoundType, number> = {
  move: 0.75,
  capture: 0.75,
  castle: 0.75,
  check: 0.9,
  checkmate: 0.95,
  draw: 0.85,
};

const audioCache = new Map<string, HTMLAudioElement>();
let useFileSounds = true;
let preloadedTheme: SoundThemeId | null = null;
let activeTheme: SoundThemeId = DEFAULT_SOUND_THEME;
/** Thème dédié au mat (null = même thème que les coups). */
let mateThemeOverride: SoundThemeId | null = null;
/** Volume global 0–1. */
let masterVolume = 1;

/** Applique le thème choisi (préférence utilisateur). Vide le cache si besoin. */
export function setChessSoundTheme(themeId: SoundThemeId) {
  if (activeTheme === themeId) return;
  activeTheme = themeId;
  audioCache.clear();
  useFileSounds = themeId !== "silent" || mateThemeOverride != null;
  preloadedTheme = null;
}

export function getChessSoundTheme(): SoundThemeId {
  return activeTheme;
}

/** Son de mat issu d'un autre thème (ou null = hériter du thème principal). */
export function setMateSoundTheme(themeId: SoundThemeId | null) {
  if (mateThemeOverride === themeId) return;
  mateThemeOverride = themeId;
  audioCache.clear();
  useFileSounds =
    (activeTheme !== "silent" || (themeId != null && themeId !== "silent"));
  preloadedTheme = null;
}

export function getMateSoundTheme(): SoundThemeId | null {
  return mateThemeOverride;
}

export function setChessSoundVolume(volume: number) {
  masterVolume = Math.min(1, Math.max(0, volume));
}

export function getChessSoundVolume(): number {
  return masterVolume;
}

function effectiveThemeFor(type: FileSoundType): SoundThemeId {
  if (type === "checkmate" && mateThemeOverride) return mateThemeOverride;
  return activeTheme;
}

function cacheKey(theme: SoundThemeId, type: FileSoundType): string {
  return `${theme}:${type}`;
}

function createAudio(theme: SoundThemeId, type: FileSoundType): HTMLAudioElement | null {
  const paths = soundFilePaths(theme, type);
  if (!paths) return null;

  const audio = new Audio();
  audio.volume = VOLUME[type] * masterVolume;
  audio.preload = "auto";

  const canOgg =
    typeof audio.canPlayType === "function" &&
    audio.canPlayType('audio/ogg; codecs="vorbis"') !== "";
  audio.src = canOgg ? paths.ogg : paths.mp3;

  audio.addEventListener(
    "error",
    () => {
      if (audio.src.endsWith(".ogg")) {
        audio.src = paths.mp3;
        audio.load();
        return;
      }
      useFileSounds = false;
    },
    { once: true }
  );

  return audio;
}

function getAudio(type: FileSoundType): HTMLAudioElement | null {
  const theme = effectiveThemeFor(type);
  if (theme === "silent") return null;
  const key = cacheKey(theme, type);
  let audio = audioCache.get(key);
  if (!audio) {
    audio = createAudio(theme, type) ?? undefined;
    if (!audio) return null;
    audioCache.set(key, audio);
  }
  return audio;
}

/** Précharge les sons du thème actif (appeler après un geste utilisateur). */
export function preloadChessSounds() {
  if (typeof window === "undefined") return;
  const moveTheme = activeTheme;
  const mateTheme = mateThemeOverride ?? activeTheme;
  if (moveTheme === "silent" && mateTheme === "silent") return;
  if (preloadedTheme === moveTheme && !mateThemeOverride) return;
  preloadedTheme = moveTheme;
  (["move", "capture", "castle", "check"] as FileSoundType[]).forEach((type) => {
    if (moveTheme !== "silent") getAudio(type)?.load();
  });
  if (mateTheme !== "silent") {
    const key = cacheKey(mateTheme, "checkmate");
    if (!audioCache.has(key)) {
      const audio = createAudio(mateTheme, "checkmate");
      if (audio) {
        audioCache.set(key, audio);
        audio.load();
      }
    } else {
      audioCache.get(key)?.load();
    }
  }
}

function playFileSound(type: FileSoundType) {
  const base = getAudio(type);
  if (!base) {
    playSyntheticSound(type);
    return;
  }
  const node = base.cloneNode(true) as HTMLAudioElement;
  node.volume = VOLUME[type] * masterVolume;
  node.currentTime = 0;
  void node.play().catch(() => {
    /* Autoplay bloqué ≠ fichier mort : repli synthétique pour ce coup seulement. */
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

function playKillerCheckSynthetic() {
  tone(90, 0.18, 0.32, "sawtooth");
  tone(740, 0.07, 0.28, "square", 25);
  tone(980, 0.09, 0.24, "triangle", 70);
  tone(520, 0.14, 0.2, "sawtooth", 130);
}

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

function playDrawWhistleSynthetic() {
  tone(880, 0.12, 0.22, "sine");
  tone(660, 0.1, 0.18, "sine", 90);
  tone(880, 0.14, 0.2, "triangle", 180);
}

export function playChessSound(type: ChessSoundType, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  if (masterVolume <= 0.001) return;
  const themeForType =
    type === "checkmate" && mateThemeOverride ? mateThemeOverride : activeTheme;
  if (themeForType === "silent" && type !== "draw") return;
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
  if (flags.includes("c") || flags.includes("e")) return "capture";
  if (flags.includes("k") || flags.includes("q")) return "castle";
  return "move";
}

/** Infère le son depuis le SAN seul (relecture avant/arrière, sans flags chess.js). */
export function soundForSan(san: string): ChessSoundType {
  if (san.includes("#")) return "checkmate";
  if (san.includes("+")) return "check";
  if (san.includes("x")) return "capture";
  if (san === "O-O" || san === "O-O-O" || san.startsWith("O-O")) return "castle";
  return "move";
}

/** Son de déplacement lors d’un pas de relecture (avant / arrière). */
export function playSanMoveSound(san: string | undefined | null, enabled = true) {
  if (!enabled) return;
  if (!san) {
    playChessSound("move", true);
    return;
  }
  playChessSound(soundForSan(san), true);
}

function normalizeFenInput(fen: string): string {
  if (fen === "start") return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  return fen.replace(/\[.*?\]/g, "").trim();
}

/**
 * Infère le son d’un coup à partir d’un changement de FEN.
 * Nécessaire en parties live : un FEN seul n’a pas d’historique chess.js.
 */
export function inferSoundFromFenChange(
  prevFen: string,
  nextFen: string,
  lastMove?: { from: string; to: string } | null
): ChessSoundType | null {
  try {
    const before = new Chess(normalizeFenInput(prevFen));
    const after = new Chess(normalizeFenInput(nextFen));
    const afterFen = after.fen();

    const all = before.moves({ verbose: true });
    const candidates =
      lastMove?.from && lastMove?.to
        ? all.filter((m) => m.from === lastMove.from && m.to === lastMove.to)
        : all;

    const pool = candidates.length > 0 ? candidates : all;
    for (const m of pool) {
      const probe = new Chess(before.fen());
      const applied = probe.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion,
      });
      if (!applied) continue;
      if (probe.fen() === afterFen) {
        return soundForMove(applied.flags, applied.san);
      }
    }
  } catch {
    /* FEN invalide ou saut multi-coups */
  }
  return null;
}

export function playDrawWhistle(enabled = true) {
  playChessSound("draw", enabled);
}

/** Fanfare courte — victoire */
export function playGameVictory(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  if (activeTheme === "silent" || masterVolume <= 0.001) return;
  const v = masterVolume;
  tone(262, 0.14, 0.22 * v, "triangle");
  tone(330, 0.14, 0.22 * v, "triangle", 120);
  tone(392, 0.14, 0.24 * v, "triangle", 240);
  tone(523, 0.28, 0.28 * v, "triangle", 360);
}

/** Son grave — défaite */
export function playGameDefeat(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  if (activeTheme === "silent" || masterVolume <= 0.001) return;
  const v = masterVolume;
  tone(220, 0.2, 0.2 * v, "sawtooth");
  tone(165, 0.25, 0.18 * v, "sine", 150);
  tone(110, 0.35, 0.15 * v, "sine", 300);
}
