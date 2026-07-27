import { create } from "zustand";
import {
  DEFAULT_BOARD_THEME,
  isBoardThemeId,
  type BoardThemeId,
} from "@/lib/boardThemes";
import {
  DEFAULT_BOARD_BACKGROUND,
  isBoardBackgroundId,
  type BoardBackgroundId,
} from "@/lib/boardBackgrounds";
import {
  DEFAULT_SOUND_THEME,
  isSoundThemeId,
  type SoundThemeId,
} from "@/lib/soundThemes";
import { isPieceSetId, type PieceSetId } from "@/lib/pieceSets";
import {
  preferenceStorageKey,
  setPreferenceScopeUserId,
} from "@/store/preferenceScope";

const BOARD_THEME_KEY = "board_theme";
const BOARD_BACKGROUND_KEY = "board_background";
const AI_COMMENTS_KEY = "ai_comments";
const PIECE_SET_KEY = "piece_set";
const SOUND_THEME_KEY = "sound_theme";
const MATE_SOUND_THEME_KEY = "mate_sound_theme";
const SOUND_VOLUME_KEY = "sound_volume";
const ZEN_KEY = "zen_mode";
const BLIND_KEY = "blind_mode";
const BOARD_SIZE_KEY = "board_size";

export type { PieceSetId };

export const SOUND_VOLUME_DEFAULT = 0.85;

// Taille de l'échiquier en pourcentage (100 = valeur automatique par défaut).
export const BOARD_SIZE_MIN = 70;
export const BOARD_SIZE_MAX = 130;
export const BOARD_SIZE_DEFAULT = 100;
export const BOARD_SIZE_STEP = 5;

export function clampBoardSize(value: number): number {
  if (!Number.isFinite(value)) return BOARD_SIZE_DEFAULT;
  return Math.min(BOARD_SIZE_MAX, Math.max(BOARD_SIZE_MIN, Math.round(value)));
}

export { preferenceStorageKey } from "@/store/preferenceScope";

function readBoardTheme(): BoardThemeId {
  if (typeof window === "undefined") return DEFAULT_BOARD_THEME;
  const stored = localStorage.getItem(preferenceStorageKey(BOARD_THEME_KEY));
  return isBoardThemeId(stored) ? stored : DEFAULT_BOARD_THEME;
}

function readBoardBackground(): BoardBackgroundId {
  if (typeof window === "undefined") return DEFAULT_BOARD_BACKGROUND;
  const stored = localStorage.getItem(preferenceStorageKey(BOARD_BACKGROUND_KEY));
  return isBoardBackgroundId(stored) ? stored : DEFAULT_BOARD_BACKGROUND;
}

function readAiComments(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(preferenceStorageKey(AI_COMMENTS_KEY));
  if (stored === null) return true;
  return stored === "1";
}

function readPieceSet(): PieceSetId {
  if (typeof window === "undefined") return "classic";
  const v = localStorage.getItem(preferenceStorageKey(PIECE_SET_KEY));
  return isPieceSetId(v) ? v : "classic";
}

function readZenMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(preferenceStorageKey(ZEN_KEY)) === "1";
}

function readBlindMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(preferenceStorageKey(BLIND_KEY)) === "1";
}

function readSoundTheme(): SoundThemeId {
  if (typeof window === "undefined") return DEFAULT_SOUND_THEME;
  const stored = localStorage.getItem(preferenceStorageKey(SOUND_THEME_KEY));
  return isSoundThemeId(stored) ? stored : DEFAULT_SOUND_THEME;
}

/** null = hériter du thème coups ; sinon thème fichier pour le mat uniquement. */
function readMateSoundTheme(): SoundThemeId | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(preferenceStorageKey(MATE_SOUND_THEME_KEY));
  if (stored === null || stored === "" || stored === "inherit") return null;
  return isSoundThemeId(stored) ? stored : null;
}

function readSoundVolume(): number {
  if (typeof window === "undefined") return SOUND_VOLUME_DEFAULT;
  const stored = localStorage.getItem(preferenceStorageKey(SOUND_VOLUME_KEY));
  if (stored === null) return SOUND_VOLUME_DEFAULT;
  const parsed = Number.parseFloat(stored);
  if (!Number.isFinite(parsed)) return SOUND_VOLUME_DEFAULT;
  return Math.min(1, Math.max(0, parsed));
}

function readBoardSize(): number {
  if (typeof window === "undefined") return BOARD_SIZE_DEFAULT;
  const stored = localStorage.getItem(preferenceStorageKey(BOARD_SIZE_KEY));
  if (stored === null) return BOARD_SIZE_DEFAULT;
  const parsed = Number.parseInt(stored, 10);
  return Number.isNaN(parsed) ? BOARD_SIZE_DEFAULT : clampBoardSize(parsed);
}

/** Recharge thème, arrière-plan, etc. après connexion / déconnexion. */
export function syncPreferencesForUser(userId: number | null) {
  setPreferenceScopeUserId(userId);
  const zenMode = readZenMode();
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("zen-mode", zenMode);
  }
  usePreferencesStore.setState({
    boardTheme: readBoardTheme(),
    boardBackground: readBoardBackground(),
    pieceSet: readPieceSet(),
    soundTheme: readSoundTheme(),
    mateSoundTheme: readMateSoundTheme(),
    soundVolume: readSoundVolume(),
    aiCommentsEnabled: readAiComments(),
    zenMode,
    blindMode: readBlindMode(),
    boardSize: readBoardSize(),
  });
}

interface PreferencesState {
  boardTheme: BoardThemeId;
  boardBackground: BoardBackgroundId;
  pieceSet: PieceSetId;
  soundTheme: SoundThemeId;
  mateSoundTheme: SoundThemeId | null;
  soundVolume: number;
  aiCommentsEnabled: boolean;
  zenMode: boolean;
  blindMode: boolean;
  boardSize: number;
  setBoardTheme: (id: BoardThemeId) => void;
  setBoardBackground: (id: BoardBackgroundId) => void;
  setPieceSet: (id: PieceSetId) => void;
  setSoundTheme: (id: SoundThemeId) => void;
  setMateSoundTheme: (id: SoundThemeId | null) => void;
  setSoundVolume: (value: number) => void;
  setAiCommentsEnabled: (enabled: boolean) => void;
  setZenMode: (enabled: boolean) => void;
  setBlindMode: (enabled: boolean) => void;
  setBoardSize: (value: number) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  boardTheme: DEFAULT_BOARD_THEME,
  boardBackground: DEFAULT_BOARD_BACKGROUND,
  pieceSet: "classic" as PieceSetId,
  soundTheme: DEFAULT_SOUND_THEME,
  mateSoundTheme: null as SoundThemeId | null,
  soundVolume: SOUND_VOLUME_DEFAULT,
  aiCommentsEnabled: true,
  zenMode: false,
  blindMode: false,
  boardSize: BOARD_SIZE_DEFAULT,
  setBoardTheme: (id) => {
    localStorage.setItem(preferenceStorageKey(BOARD_THEME_KEY), id);
    set({ boardTheme: id });
  },
  setBoardBackground: (id) => {
    localStorage.setItem(preferenceStorageKey(BOARD_BACKGROUND_KEY), id);
    set({ boardBackground: id });
  },
  setPieceSet: (id) => {
    localStorage.setItem(preferenceStorageKey(PIECE_SET_KEY), id);
    set({ pieceSet: id });
  },
  setSoundTheme: (id) => {
    localStorage.setItem(preferenceStorageKey(SOUND_THEME_KEY), id);
    set({ soundTheme: id });
  },
  setMateSoundTheme: (id) => {
    localStorage.setItem(
      preferenceStorageKey(MATE_SOUND_THEME_KEY),
      id == null ? "inherit" : id
    );
    set({ mateSoundTheme: id });
  },
  setSoundVolume: (value) => {
    const clamped = Math.min(1, Math.max(0, value));
    localStorage.setItem(preferenceStorageKey(SOUND_VOLUME_KEY), String(clamped));
    set({ soundVolume: clamped });
  },
  setAiCommentsEnabled: (enabled) => {
    localStorage.setItem(preferenceStorageKey(AI_COMMENTS_KEY), enabled ? "1" : "0");
    set({ aiCommentsEnabled: enabled });
  },
  setZenMode: (enabled) => {
    localStorage.setItem(preferenceStorageKey(ZEN_KEY), enabled ? "1" : "0");
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("zen-mode", enabled);
    }
    set({ zenMode: enabled });
  },
  setBlindMode: (enabled) => {
    localStorage.setItem(preferenceStorageKey(BLIND_KEY), enabled ? "1" : "0");
    set({ blindMode: enabled });
  },
  setBoardSize: (value) => {
    const clamped = clampBoardSize(value);
    localStorage.setItem(preferenceStorageKey(BOARD_SIZE_KEY), String(clamped));
    set({ boardSize: clamped });
  },
}));
