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
  preferenceStorageKey,
  setPreferenceScopeUserId,
} from "@/store/preferenceScope";

const BOARD_THEME_KEY = "board_theme";
const BOARD_BACKGROUND_KEY = "board_background";
const AI_COMMENTS_KEY = "ai_comments";
const PIECE_SET_KEY = "piece_set";
const ZEN_KEY = "zen_mode";

export type PieceSetId = "classic" | "african" | "african-svg";

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
  if (v === "african" || v === "african-svg") return v;
  return "classic";
}

function readZenMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(preferenceStorageKey(ZEN_KEY)) === "1";
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
    aiCommentsEnabled: readAiComments(),
    zenMode,
  });
}

interface PreferencesState {
  boardTheme: BoardThemeId;
  boardBackground: BoardBackgroundId;
  pieceSet: PieceSetId;
  aiCommentsEnabled: boolean;
  zenMode: boolean;
  setBoardTheme: (id: BoardThemeId) => void;
  setBoardBackground: (id: BoardBackgroundId) => void;
  setPieceSet: (id: PieceSetId) => void;
  setAiCommentsEnabled: (enabled: boolean) => void;
  setZenMode: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  boardTheme: readBoardTheme(),
  boardBackground: readBoardBackground(),
  pieceSet: readPieceSet(),
  aiCommentsEnabled: readAiComments(),
  zenMode: readZenMode(),
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
}));
