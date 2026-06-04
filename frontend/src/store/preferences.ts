import { create } from "zustand";
import {
  DEFAULT_BOARD_THEME,
  isBoardThemeId,
  type BoardThemeId,
} from "@/lib/boardThemes";

const BOARD_THEME_KEY = "board_theme";

function readBoardTheme(): BoardThemeId {
  if (typeof window === "undefined") return DEFAULT_BOARD_THEME;
  const stored = localStorage.getItem(BOARD_THEME_KEY);
  return isBoardThemeId(stored) ? stored : DEFAULT_BOARD_THEME;
}

interface PreferencesState {
  boardTheme: BoardThemeId;
  setBoardTheme: (id: BoardThemeId) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  boardTheme: readBoardTheme(),
  setBoardTheme: (id) => {
    localStorage.setItem(BOARD_THEME_KEY, id);
    set({ boardTheme: id });
  },
}));
