import { create } from "zustand";
import type { PuzzleGardenThemeId } from "@/lib/puzzleGardenThemes";
import { preferenceStorageKey } from "@/store/preferenceScope";

const SOUNDS_KEY = "puzzle_sounds";
const VOLUME_KEY = "puzzle_volume";
const GARDEN_THEME_KEY = "puzzle_garden_theme";
const LIFETIME_SOLVED_KEY = "puzzle_lifetime_solved";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(preferenceStorageKey(key));
  if (v === null) return fallback;
  return v === "1";
}

function readVolume(): number {
  if (typeof window === "undefined") return 0.85;
  const v = localStorage.getItem(preferenceStorageKey(VOLUME_KEY));
  const n = v ? parseFloat(v) : 0.85;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.85;
}

function readGardenTheme(): PuzzleGardenThemeId {
  if (typeof window === "undefined") return "savanna";
  const v = localStorage.getItem(preferenceStorageKey(GARDEN_THEME_KEY));
  if (v === "forest" || v === "night" || v === "aurora") return v;
  return "savanna";
}

export function getLifetimePuzzleSolved(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(preferenceStorageKey(LIFETIME_SOLVED_KEY)) || 0);
}

export function incrementLifetimePuzzleSolved() {
  if (typeof window === "undefined") return;
  const n = getLifetimePuzzleSolved() + 1;
  localStorage.setItem(preferenceStorageKey(LIFETIME_SOLVED_KEY), String(n));
  return n;
}

interface PuzzlePreferencesState {
  soundsEnabled: boolean;
  soundVolume: number;
  gardenTheme: PuzzleGardenThemeId;
  setSoundsEnabled: (v: boolean) => void;
  setSoundVolume: (v: number) => void;
  setGardenTheme: (id: PuzzleGardenThemeId) => void;
}

export const usePuzzlePreferencesStore = create<PuzzlePreferencesState>((set) => ({
  soundsEnabled: readBool(SOUNDS_KEY, true),
  soundVolume: readVolume(),
  gardenTheme: readGardenTheme(),
  setSoundsEnabled: (v) => {
    localStorage.setItem(preferenceStorageKey(SOUNDS_KEY), v ? "1" : "0");
    set({ soundsEnabled: v });
  },
  setSoundVolume: (v) => {
    const clamped = Math.min(1, Math.max(0, v));
    localStorage.setItem(preferenceStorageKey(VOLUME_KEY), String(clamped));
    set({ soundVolume: clamped });
  },
  setGardenTheme: (id) => {
    localStorage.setItem(preferenceStorageKey(GARDEN_THEME_KEY), id);
    set({ gardenTheme: id });
  },
}));

export function puzzleSoundsActive(lowBandwidth: boolean): boolean {
  const { soundsEnabled } = usePuzzlePreferencesStore.getState();
  return soundsEnabled && !lowBandwidth;
}

export function syncPuzzlePreferencesFromStorage() {
  if (typeof window === "undefined") return;
  const v = localStorage.getItem(preferenceStorageKey(GARDEN_THEME_KEY));
  const theme: PuzzleGardenThemeId =
    v === "forest" || v === "night" || v === "aurora" ? v : "savanna";
  usePuzzlePreferencesStore.setState({
    soundsEnabled: readBool(SOUNDS_KEY, true),
    soundVolume: readVolume(),
    gardenTheme: theme,
  });
}
