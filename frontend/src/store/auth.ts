import { create } from "zustand";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";
import { formatApiError } from "@/lib/errors";

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
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    country: string;
  }) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  locale: (typeof window !== "undefined" && (localStorage.getItem("locale") as AuthState["locale"])) || "fr",
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
      const { data } = await authApi.login(username.trim(), password);
      if (!data.access) {
        throw new Error("Réponse de connexion invalide.");
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
    set({ isLoading: true });
    try {
      await authApi.register({
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        password_confirm: data.password_confirm,
        country: data.country,
      });
      await get().login(data.username.trim(), data.password);
    } catch (error) {
      throw new Error(formatApiError(error));
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
