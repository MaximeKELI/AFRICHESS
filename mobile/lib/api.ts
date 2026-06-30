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
  name_en?: string;
  elo: number;
  avatar_id: string;
  avatar_url?: string;
  is_premium: boolean;
  is_legend?: boolean;
  personality?: string;
  opening_style?: string;
  description?: string;
}

export interface GameMove {
  uci: string;
  san: string;
  played_by_white: boolean;
  move_number: number;
  comment?: string;
}

export type GameVariant =
  | "standard"
  | "chess960"
  | "crazyhouse"
  | "kingofthehill"
  | "threecheck";

export interface PublicUser {
  id: number;
  username: string;
  display_name?: string;
}

export interface GameData {
  id: string;
  fen: string;
  status: string;
  result?: string;
  is_vs_ai: boolean;
  white_player?: PublicUser | null;
  black_player?: PublicUser | null;
  ai_target_elo?: number;
  moves?: GameMove[];
  variant?: GameVariant;
  is_timed?: boolean;
  white_time_ms?: number;
  black_time_ms?: number;
  increment_ms?: number;
  bot?: Bot;
}

export interface Puzzle {
  id: number;
  fen: string;
  themes: string[];
  difficulty: string;
  rating: number;
  is_daily?: boolean;
}

export const puzzlesApi = {
  daily: () => api.get<Puzzle>("/puzzles/daily/"),
  rush: (count = 15) =>
    api.get<Puzzle[]>("/puzzles/rush/", { params: { count } }),
  submit: (id: number, moves: string[], time_seconds: number) =>
    api.post<{ solved: boolean; daily_streak?: number }>(`/puzzles/${id}/submit/`, {
      moves,
      time_seconds,
    }),
  streak: () => api.get<{ daily_streak: number }>("/puzzles/streak/"),
};

export const gamesApi = {
  bots: (params?: { q?: string; legends?: boolean }) =>
    api.get<Bot[]>("/games/bots/", {
      params: {
        q: params?.q,
        legends: params?.legends ? "1" : undefined,
      },
    }),
  createAI: (data: {
    mode: string;
    color: "white" | "black";
    ai_elo?: number;
    bot_slug?: string;
    variant?: GameVariant;
    include_comments?: boolean;
  }) => api.post<GameData>("/games/ai/", data),
  get: (id: string) => api.get<GameData>(`/games/${id}/`),
  matchmaking: (
    mode: string,
    opts?: { is_timed?: boolean; is_rated?: boolean; time_control?: string }
  ) =>
    api.post<GameData & { comments_pending?: boolean }>("/games/matchmaking/", {
      mode,
      is_timed: opts?.is_timed ?? true,
      is_rated: opts?.is_rated ?? true,
      time_control: opts?.time_control ?? "3+2",
    }),
  leaveQueue: () => api.delete("/games/matchmaking/"),
  move: (
    id: string,
    uci: string,
    opts?: { spentMs?: number; includeComments?: boolean }
  ) =>
    api.post<GameData & { comments_pending?: boolean }>(`/games/${id}/move/`, {
      uci,
      include_comments: opts?.includeComments ?? false,
      ...(opts?.spentMs != null ? { spent_ms: opts.spentMs } : {}),
    }),
  undo: (id: string) => api.post<GameData>(`/games/${id}/undo/`),
  resign: (id: string) => api.post<GameData>(`/games/${id}/resign/`),
};

export interface FriendUser {
  id: number;
  username: string;
  display_name?: string;
}

export interface FriendRow {
  id: number;
  user: FriendUser;
  friend: FriendUser;
  status: string;
}

export const socialApi = {
  friends: () => api.get<FriendRow[]>("/social/friends/"),
  pending: () => api.get<FriendRow[]>("/social/friends/pending/"),
  request: (username: string) => api.post("/social/friends/request/", { username }),
  accept: (id: number) => api.post(`/social/friends/${id}/accept/`),
};

export { API_ORIGIN };
