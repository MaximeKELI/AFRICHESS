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

const BOARD_THEME_KEY = "board_theme";
const BOARD_BACKGROUND_KEY = "board_background";
const AI_COMMENTS_KEY = "ai_comments";
const PIECE_SET_KEY = "piece_set";

export type PieceSetId = "classic" | "african" | "african-svg";

function readBoardTheme(): BoardThemeId {
  if (typeof window === "undefined") return DEFAULT_BOARD_THEME;
  const stored = localStorage.getItem(BOARD_THEME_KEY);
  return isBoardThemeId(stored) ? stored : DEFAULT_BOARD_THEME;
}

function readAiComments(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AI_COMMENTS_KEY) === "1";
}

function readPieceSet(): PieceSetId {
  if (typeof window === "undefined") return "classic";
  const v = localStorage.getItem(PIECE_SET_KEY);
  if (v === "african" || v === "african-svg") return v;
  return "classic";
}

interface PreferencesState {
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  aiCommentsEnabled: boolean;
  zenMode: boolean;
  setBoardTheme: (id: BoardThemeId) => void;
  setPieceSet: (id: PieceSetId) => void;
  setAiCommentsEnabled: (enabled: boolean) => void;
  setZenMode: (enabled: boolean) => void;
}

const ZEN_KEY = "zen_mode";

function readZenMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ZEN_KEY) === "1";
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  boardTheme: readBoardTheme(),
  pieceSet: readPieceSet(),
  aiCommentsEnabled: readAiComments(),
  zenMode: readZenMode(),
  setBoardTheme: (id) => {
    localStorage.setItem(BOARD_THEME_KEY, id);
    set({ boardTheme: id });
  },
  setPieceSet: (id) => {
    localStorage.setItem(PIECE_SET_KEY, id);
    set({ pieceSet: id });
  },
  setAiCommentsEnabled: (enabled) => {
    localStorage.setItem(AI_COMMENTS_KEY, enabled ? "1" : "0");
    set({ aiCommentsEnabled: enabled });
  },
  setZenMode: (enabled) => {
    localStorage.setItem(ZEN_KEY, enabled ? "1" : "0");
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("zen-mode", enabled);
    }
    set({ zenMode: enabled });
  },
}));
