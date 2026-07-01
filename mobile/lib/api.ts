import axios from "axios";
import Constants from "expo-constants";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./storage";

export const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ?? "http://10.0.2.2:8000/api";

const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export { API_ORIGIN };

const NO_AUTH_PATHS = [
  "/auth/login/",
  "/auth/register/",
  "/auth/token/refresh/",
  "/users/register/",
  "/users/auth/oauth/exchange/",
];

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

let refreshInFlight: Promise<string | null> | null = null;

api.interceptors.request.use(async (config) => {
  const path = config.url ?? "";
  if (NO_AUTH_PATHS.some((p) => path.includes(p))) {
    return config;
  }
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    await clearTokens();
    return null;
  }
  try {
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${API_URL}/auth/token/refresh/`,
      { refresh }
    );
    await setTokens(data.access, data.refresh ?? refresh);
    return data.access;
  } catch {
    await clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const access = await refreshInFlight;
    if (!access) {
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${access}`;
    return api(original);
  }
);

export class LoginError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly oauthCode?: string
  ) {
    super(message);
    this.name = "LoginError";
  }
}

export const authApi = {
  login: (username: string, password: string, totpCode?: string) =>
    api.post<{ access: string; refresh: string }>("/auth/login/", {
      username,
      password,
      ...(totpCode ? { totp_code: totpCode } : {}),
    }),
  profile: () => api.get("/users/profile/"),
  oauthExchange: (code: string, totpCode?: string) =>
    api.post<{ access: string; refresh: string }>("/users/auth/oauth/exchange/", {
      code,
      ...(totpCode ? { totp_code: totpCode } : {}),
    }),
};

export const usersApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    country?: string;
  }) =>
    api.post<{ username: string; access: string; refresh: string }>("/users/register/", data),
  subscriptionPlans: () =>
    api.get<{ plans: { id: string; price_eur: number; features: string[] }[]; stripe_enabled: boolean }>(
      "/users/subscription/plans/"
    ),
  subscriptionStatus: () =>
    api.get<{ tier: string; is_premium: boolean; has_billing_portal?: boolean }>(
      "/users/subscription/status/"
    ),
  billingPortal: () =>
    api.post<{ portal_url: string }>("/users/subscription/billing-portal/"),
  subscribe: (plan: "gold" | "diamond") =>
    api.post<{ mode: string; checkout_url?: string; tier?: string; is_premium?: boolean; message?: string }>(
      "/users/subscription/subscribe/",
      { plan }
    ),
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
  is_rated?: boolean;
  move_count?: number;
  draw_offered_by?: number | null;
  takeback_requested_by?: number | null;
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
  rushStart: () =>
    api.post<{
      session_id: number;
      puzzle: Puzzle;
      ends_at: string;
      duration: number;
    }>("/puzzles/rush/start/"),
  rushSubmit: (sessionId: number, moves: string[], time_seconds: number) =>
    api.post<{
      solved: boolean;
      score: number;
      misses: number;
      completed: boolean;
      next_puzzle?: Puzzle;
      time_left?: number;
      reason?: string;
    }>(`/puzzles/rush/${sessionId}/submit/`, { moves, time_seconds }),
  submit: (id: number, moves: string[], time_seconds: number) =>
    api.post<{ solved: boolean; daily_streak?: number }>(`/puzzles/${id}/submit/`, {
      moves,
      time_seconds,
    }),
  streak: () => api.get<{ daily_streak: number }>("/puzzles/streak/"),
  training: (difficulty = "medium", count = 10, theme?: string) =>
    api.get<Puzzle[]>("/puzzles/training/", { params: { difficulty, count, theme } }),
  survivalStart: () =>
    api.post<{ session_id: number; puzzle: Puzzle }>("/puzzles/survival/start/"),
  survivalSubmit: (sessionId: number, moves: string[], time_seconds: number) =>
    api.post<{
      solved: boolean;
      score: number;
      completed: boolean;
      next_puzzle?: Puzzle;
    }>(`/puzzles/survival/${sessionId}/submit/`, { moves, time_seconds }),
  battleQueue: () =>
    api.post<{ battle_id: number; status: string; opponent?: string; puzzle?: Puzzle }>(
      "/puzzles/battle/queue/"
    ),
  battleGet: (id: number) =>
    api.get<{
      id: number;
      status: string;
      score1: number;
      score2: number;
      puzzle?: Puzzle;
      winner_id?: number | null;
    }>(`/puzzles/battle/${id}/`),
  battleSubmit: (id: number, moves: string[], time_seconds: number) =>
    api.post<{
      solved: boolean;
      score1: number;
      score2: number;
      completed: boolean;
      next_puzzle?: Puzzle;
      winner_id?: number | null;
    }>(`/puzzles/battle/${id}/`, { moves, time_seconds }),
  battleLeave: () => api.delete("/puzzles/battle/queue/"),
};

export interface CourseSummary {
  id: number;
  slug: string;
  title: string;
  level: string;
  description: string;
  lesson_count: number;
  xp_reward: number;
}

export interface VideoSummary {
  id: number;
  title: string;
  slug: string;
  duration_seconds?: number;
  is_premium?: boolean;
}

export interface TournamentSummary {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  format: string;
  participant_count: number;
  starts_at?: string;
  is_african_cup?: boolean;
}

export const learningApi = {
  courses: (lang = "fr") =>
    api.get<CourseSummary[]>("/learning/courses/", { params: { lang } }),
  videos: () => api.get<VideoSummary[]>("/learning/videos/"),
};

export const tournamentsApi = {
  list: () => api.get<TournamentSummary[]>("/tournaments/"),
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
    opts?: {
      is_timed?: boolean;
      is_rated?: boolean;
      time_control?: string;
      variant?: GameVariant;
    }
  ) =>
    api.post<GameData & { comments_pending?: boolean }>("/games/matchmaking/", {
      mode,
      is_timed: opts?.is_timed ?? true,
      is_rated: opts?.is_rated ?? true,
      time_control: opts?.time_control ?? "3+2",
      variant: opts?.variant ?? "standard",
    }),
  leaveQueue: () => api.delete("/games/matchmaking/"),
  move: (
    id: string,
    uci: string,
    opts?: { spentMs?: number; includeComments?: boolean; telemetry?: Record<string, number | undefined> }
  ) =>
    api.post<GameData & { comments_pending?: boolean }>(`/games/${id}/move/`, {
      uci,
      include_comments: opts?.includeComments ?? false,
      ...(opts?.spentMs != null ? { spent_ms: opts.spentMs } : {}),
      ...(opts?.telemetry ? { telemetry: opts.telemetry } : {}),
    }),
  undo: (id: string) => api.post<GameData>(`/games/${id}/undo/`),
  resign: (id: string) => api.post<GameData>(`/games/${id}/resign/`),
  abort: (id: string) => api.post<GameData>(`/games/${id}/abort/`),
  offerDraw: (id: string) => api.post<{ offered_by?: number }>(`/games/${id}/draw/`),
  respondDraw: (id: string, accept: boolean) =>
    api.post(`/games/${id}/draw/respond/`, { accept }),
  offerTakeback: (id: string) => api.post<{ requested_by?: number }>(`/games/${id}/takeback/`),
  respondTakeback: (id: string, accept: boolean) =>
    api.post(`/games/${id}/takeback/respond/`, { accept }),
  fairplayStatus: () =>
    api.get<{ consent_given: boolean; exempt?: boolean; blocked?: boolean }>("/games/fairplay/status/"),
  fairplayConsent: () => api.post("/games/fairplay/consent/"),
  correspondence: () => api.get<GameData[]>("/games/correspondence/"),
  correspondenceSeek: (days_per_move = 3) =>
    api.post<GameData>("/games/correspondence/seek/", { days_per_move }),
  leaveCorrespondenceQueue: () => api.delete("/games/correspondence/seek/"),
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
