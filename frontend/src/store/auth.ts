import { create } from "zustand";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import { authApi } from "@/lib/api";
import { setAccessToken, setRefreshToken } from "@/lib/cookies";
import { formatApiError } from "@/lib/errors";
import { translate } from "@/lib/i18n";
import { clearAuthCookies } from "@/lib/session";
import { syncPreferencesForUser } from "@/store/preferences";

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar?: string | null;
  flair?: string | null;
  chess_level?: string;
  country: string;
  is_staff?: boolean;
  subscription_tier?: string;
  is_premium?: boolean;
  is_diamond?: boolean;
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
  login: (username: string, password: string, totpCode?: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    country: string;
    city?: string;
    chess_level?: string;
    preferred_language?: string;
    birth_year?: number;
    gender?: string;
    discovery_source?: string;
    registration_locale?: string;
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

  login: async (username, password, totpCode) => {
    const loginId = username.trim();
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(loginId, password, totpCode);
      if (!data.access) {
        throw new Error(translate(get().locale, "auth.login.invalidResponse"));
      }
      setAccessToken(data.access);
      setRefreshToken(data.refresh);

      // Réponse dj-rest-auth inclut souvent user — secours si /profile échoue
      const loginUser = data.user as { pk?: number; username?: string } | undefined;
      if (loginUser?.pk && loginUser.username) {
        set({
          user: {
            id: loginUser.pk,
            username: loginUser.username,
            display_name: loginUser.username,
            country: "",
          },
        });
        syncPreferencesForUser(loginUser.pk);
      }

      await get().fetchProfile();
      if (!get().user) {
        throw new Error(translate(get().locale, "errors.profileLoadFailed"));
      }
    } catch (error) {
      if (error instanceof Error && !(error instanceof AxiosError)) {
        throw error;
      }
      const msg = formatApiError(error);
      if (msg.includes("TOTP_REQUIRED")) {
        throw new Error("TOTP_REQUIRED");
      }
      if (loginId.includes("@") && msg.includes("Identifiants")) {
        throw new Error(translate(get().locale, "auth.login.useUsername"));
      }
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ isLoading: true });
    try {
      const payload: Record<string, string | number> = {
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        password_confirm: data.password_confirm,
        country: data.country,
        chess_level: data.chess_level ?? "intermediate",
      };
      if (data.city?.trim()) payload.city = data.city.trim();
      if (data.preferred_language) payload.preferred_language = data.preferred_language;
      if (data.birth_year) payload.birth_year = data.birth_year;
      if (data.gender) payload.gender = data.gender;
      if (data.discovery_source) payload.discovery_source = data.discovery_source;
      if (data.registration_locale) payload.registration_locale = data.registration_locale;
      const { data: res } = await authApi.register(payload);
      if (res.access && res.refresh) {
        setAccessToken(res.access);
        setRefreshToken(res.refresh);
        await get().fetchProfile();
        if (!get().user) {
          throw new Error(translate(get().locale, "errors.profileLoadFailed"));
        }
      } else {
        await get().login(data.username.trim(), data.password);
      }
    } catch (error) {
      throw new Error(formatApiError(error));
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    const refresh = Cookies.get("refresh_token");
    if (refresh) {
      authApi.logout(refresh).catch(() => undefined);
    }
    clearAuthCookies();
    syncPreferencesForUser(null);
    set({ user: null });
  },

  fetchProfile: async () => {
    if (!Cookies.get("access_token") && !Cookies.get("refresh_token")) {
      syncPreferencesForUser(null);
      set({ user: null });
      return;
    }
    try {
      const { data } = await authApi.profile();
      set({ user: data });
      syncPreferencesForUser(data.id);
    } catch (error) {
      if (!Cookies.get("access_token") && !Cookies.get("refresh_token")) {
        syncPreferencesForUser(null);
        set({ user: null });
      }
    }
  },
}));
