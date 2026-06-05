import { create } from "zustand";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import { authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import { translate } from "@/lib/i18n";
import { clearAuthCookies } from "@/lib/session";

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar?: string | null;
  chess_level?: string;
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
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    country: string;
    chess_level?: string;
  }) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  locale: (typeof window !== "undefined" && (localStorage.getItem("locale") as AuthState["locale"])) || "fr",
  darkMode: typeof window !== "undefined" && localStorage.getItem("theme") === "dark",
  lowBandwidth:
    typeof window !== "undefined" && localStorage.getItem("lowBandwidth") === "1",

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
    localStorage.setItem("lowBandwidth", v ? "1" : "0");
    document.documentElement.classList.toggle("low-bandwidth", v);
    set({ lowBandwidth: v });
  },

  login: async (username, password) => {
    const loginId = username.trim();
    if (loginId.includes("@")) {
      throw new Error(translate(get().locale, "auth.login.useUsername"));
    }
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(loginId, password);
      if (!data.access) {
        throw new Error(translate(get().locale, "auth.login.invalidResponse"));
      }
      Cookies.set("access_token", data.access, { expires: 1 });
      Cookies.set("refresh_token", data.refresh, { expires: 7 });
      await get().fetchProfile();
    } catch (error) {
      throw new Error(formatApiError(error));
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ isLoading: true });
    try {
      await authApi.register({
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        password_confirm: data.password_confirm,
        country: data.country,
        chess_level: data.chess_level ?? "intermediate",
      });
      await get().login(data.username.trim(), data.password); // toujours par username après inscription
    } catch (error) {
      throw new Error(formatApiError(error));
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    clearAuthCookies();
    set({ user: null });
  },

  fetchProfile: async () => {
    if (!Cookies.get("access_token") && !Cookies.get("refresh_token")) {
      set({ user: null });
      return;
    }
    try {
      const { data } = await authApi.profile();
      set({ user: data });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        get().logout();
      } else {
        set({ user: null });
      }
    }
  },
}));
