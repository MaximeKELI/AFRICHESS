/**
 * Sons puzzle — MP3 + volume utilisateur + repli synthétique.
 */

import { usePuzzlePreferencesStore } from "@/store/puzzlePreferences";

const PUZZLE_SOUND_PATHS = {
  success: "/sounds/puzzle-success.mp3",
  wrong: "/sounds/puzzle-wrong.mp3",
  advance: "/sounds/puzzle-advance.mp3",
  streak: "/sounds/puzzle-streak.mp3",
} as const;

type PuzzleSoundKey = keyof typeof PUZZLE_SOUND_PATHS;

const BASE_VOLUME: Record<PuzzleSoundKey, number> = {
  success: 0.85,
  wrong: 0.75,
  advance: 0.55,
  streak: 0.9,
};

const audioCache = new Map<PuzzleSoundKey, HTMLAudioElement>();
let useFileSounds = true;

function effectiveVolume(key: PuzzleSoundKey): number {
  const { soundVolume } = usePuzzlePreferencesStore.getState();
  return BASE_VOLUME[key] * soundVolume;
}

function getAudio(key: PuzzleSoundKey): HTMLAudioElement {
  let audio = audioCache.get(key);
  if (!audio) {
    audio = new Audio(PUZZLE_SOUND_PATHS[key]);
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      useFileSounds = false;
    }, { once: true });
    audioCache.set(key, audio);
  }
  return audio;
}

function playFileSound(key: PuzzleSoundKey) {
  const base = getAudio(key);
  const node = base.cloneNode(true) as HTMLAudioElement;
  node.volume = effectiveVolume(key);
  node.currentTime = 0;
  void node.play().catch(() => {
    useFileSounds = false;
    playSynthetic(key);
  });
}

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
  const vol = volume * usePuzzlePreferencesStore.getState().soundVolume;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playSuccessSynthetic() {
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.16, 0.16, "triangle", i * 70));
  tone(1318.51, 0.35, 0.1, "sine", 420);
}

function playStreakSynthetic() {
  [523, 659, 784, 988, 1175, 1319].forEach((f, i) => tone(f, 0.14, 0.18, "triangle", i * 55));
  tone(1568, 0.5, 0.12, "sine", 380);
}

function playWrongSynthetic() {
  tone(180, 0.12, 0.22, "sawtooth");
  tone(95, 0.22, 0.18, "sawtooth", 90);
}

function playAdvanceSynthetic() {
  tone(440, 0.06, 0.1, "sine");
  tone(554.37, 0.08, 0.09, "triangle", 50);
}

function playSynthetic(key: PuzzleSoundKey) {
  if (key === "streak") playStreakSynthetic();
  else if (key === "success") playSuccessSynthetic();
  else if (key === "wrong") playWrongSynthetic();
  else playAdvanceSynthetic();
}

function play(key: PuzzleSoundKey, enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  preloadPuzzleSounds();
  if (useFileSounds && key !== "streak") playFileSound(key);
  else if (useFileSounds && key === "streak") {
    playFileSound("streak");
  } else playSynthetic(key);
}

export function playPuzzleSuccess(enabled = true) {
  play("success", enabled);
}

export function playPuzzleStreakFanfare(enabled = true) {
  play("streak", enabled);
}

export function playPuzzleWrong(enabled = true) {
  play("wrong", enabled);
}

export function playPuzzleAdvance(enabled = true) {
  play("advance", enabled);
}

export function preloadPuzzleSounds() {
  if (typeof window === "undefined") return;
  (Object.keys(PUZZLE_SOUND_PATHS) as PuzzleSoundKey[]).forEach((key) => {
    getAudio(key).load();
  });
  getContext();
}
