import { create } from "zustand";
import {
  DEFAULT_BOARD_THEME,
  isBoardThemeId,
  type BoardThemeId,
} from "@/lib/boardThemes";

const BOARD_THEME_KEY = "board_theme";
const AI_COMMENTS_KEY = "ai_comments";

function readBoardTheme(): BoardThemeId {
  if (typeof window === "undefined") return DEFAULT_BOARD_THEME;
  const stored = localStorage.getItem(BOARD_THEME_KEY);
  return isBoardThemeId(stored) ? stored : DEFAULT_BOARD_THEME;
}

function readAiComments(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AI_COMMENTS_KEY) === "1";
}

interface PreferencesState {
  boardTheme: BoardThemeId;
  aiCommentsEnabled: boolean;
  setBoardTheme: (id: BoardThemeId) => void;
  setAiCommentsEnabled: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  boardTheme: readBoardTheme(),
  aiCommentsEnabled: readAiComments(),
  setBoardTheme: (id) => {
    localStorage.setItem(BOARD_THEME_KEY, id);
    set({ boardTheme: id });
  },
  setAiCommentsEnabled: (enabled) => {
    localStorage.setItem(AI_COMMENTS_KEY, enabled ? "1" : "0");
    set({ aiCommentsEnabled: enabled });
  },
}));
