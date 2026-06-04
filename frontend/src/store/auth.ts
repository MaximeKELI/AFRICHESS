import { create } from "zustand";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar?: string;
  country: string;
  stats?: {
    games_played: number;
    win_rate: number;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  locale: "en" | "fr" | "ar" | "pt" | "sw";
  darkMode: boolean;
  lowBandwidth: boolean;
  setLocale: (locale: AuthState["locale"]) => void;
  toggleDarkMode: () => void;
  setLowBandwidth: (v: boolean) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  locale: (typeof window !== "undefined" && (localStorage.getItem("locale") as AuthState["locale"])) || "en",
  darkMode: typeof window !== "undefined" && localStorage.getItem("theme") === "dark",
  lowBandwidth: false,

  setLocale: (locale) => {
    localStorage.setItem("locale", locale);
    set({ locale });
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    set({ darkMode: next });
  },

  setLowBandwidth: (v) => {
    document.documentElement.classList.toggle("low-bandwidth", v);
    set({ lowBandwidth: v });
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(username, password);
      Cookies.set("access_token", data.access, { expires: 1 });
      Cookies.set("refresh_token", data.refresh, { expires: 7 });
      await get().fetchProfile();
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      await authApi.register(data);
      await get().login(data.username, data.password);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ user: null });
  },

  fetchProfile: async () => {
    try {
      const { data } = await authApi.profile();
      set({ user: data });
    } catch {
      set({ user: null });
    }
  },
}));
