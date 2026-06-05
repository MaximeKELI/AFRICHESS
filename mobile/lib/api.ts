import axios from "axios";
import Constants from "expo-constants";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./storage";

export const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ?? "http://10.0.2.2:8000/api";

const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    const refresh = await getRefreshToken();
    if (!refresh) {
      await clearTokens();
      return Promise.reject(error);
    }
    try {
      const { data } = await axios.post<{ access: string }>(`${API_URL}/auth/token/refresh/`, {
        refresh,
      });
      await setTokens(data.access, refresh);
      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);
    } catch {
      await clearTokens();
      return Promise.reject(error);
    }
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ access: string; refresh: string }>("/auth/login/", { username, password }),
  profile: () => api.get("/users/profile/"),
};

export interface Bot {
  slug: string;
  name: string;
  elo: number;
  avatar_id: string;
  is_premium: boolean;
}

export interface GameMove {
  uci: string;
  san: string;
  played_by_white: boolean;
  move_number: number;
}

export interface GameData {
  id: string;
  fen: string;
  status: string;
  result?: string;
  is_vs_ai: boolean;
  ai_target_elo?: number;
  moves?: GameMove[];
  variant?: string;
  is_timed?: boolean;
  white_time_ms?: number;
  black_time_ms?: number;
  increment_ms?: number;
  bot?: Bot;
}

export const gamesApi = {
  bots: () => api.get<Bot[]>("/games/bots/"),
  createAI: (data: {
    mode: string;
    color: "white" | "black";
    ai_elo?: number;
    bot_slug?: string;
    variant?: string;
  }) => api.post<GameData>("/games/ai/", data),
  get: (id: string) => api.get<GameData>(`/games/${id}/`),
  move: (id: string, uci: string) => api.post<GameData>(`/games/${id}/move/`, { uci }),
};

export { API_ORIGIN };
