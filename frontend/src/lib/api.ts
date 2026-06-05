import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { handleSessionExpired } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

/** Ne pas envoyer un vieux JWT sur login/inscription (sinon 401 « token not valid »). */
const NO_AUTH_PATHS = [
  "/auth/login/",
  "/auth/registration/",
  "/auth/token/refresh/",
  "/users/register/",
];

let refreshInFlight = false;
let refreshWaiters: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushRefreshWaiters(err: unknown, token?: string) {
  refreshWaiters.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else if (token) resolve(token);
  });
  refreshWaiters = [];
}

async function refreshAccessToken(): Promise<string> {
  const refresh = Cookies.get("refresh_token");
  if (!refresh) throw new Error("No refresh token");
  const { data } = await axios.post<{ access: string }>(
    `${API_URL}/auth/token/refresh/`,
    { refresh }
  );
  if (!data.access) throw new Error("Invalid refresh response");
  Cookies.set("access_token", data.access, { expires: 1 });
  return data.access;
}

api.interceptors.request.use((config) => {
  const path = config.url ?? "";
  if (NO_AUTH_PATHS.some((p) => path.includes(p))) {
    return config;
  }
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    const path = original.url ?? "";
    if (NO_AUTH_PATHS.some((p) => path.includes(p))) {
      return Promise.reject(error);
    }

    if (refreshInFlight) {
      return new Promise((resolve, reject) => {
        refreshWaiters.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    refreshInFlight = true;
    try {
      const token = await refreshAccessToken();
      flushRefreshWaiters(null, token);
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshErr) {
      flushRefreshWaiters(refreshErr);
      handleSessionExpired();
      return Promise.reject(refreshErr);
    } finally {
      refreshInFlight = false;
    }
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post("/auth/login/", { username, password }),
  register: (data: Record<string, string>) =>
    api.post("/users/register/", data),
  profile: () => api.get("/users/profile/"),
  updateProfile: (data: Record<string, string>) => api.patch("/users/profile/", data),
};

export const gamesApi = {
  list: () => api.get("/games/"),
  get: (id: string) => api.get(`/games/${id}/`),
  createAI: (data: {
    mode: string;
    color: string;
    ai_elo: number;
    include_comments?: boolean;
    is_timed?: boolean;
    time_minutes?: number | null;
  }) => api.post("/games/ai/", data),
  aiPreview: (mode: string, aiElo: number) =>
    api.get("/games/ai/preview/", { params: { mode, ai_elo: aiElo } }),
  active: () => api.get("/games/active/"),
  move: (
    id: string,
    uci: string,
    opts?: { includeComments?: boolean; spentMs?: number }
  ) =>
    api.post(`/games/${id}/move/`, {
      uci,
      include_comments: opts?.includeComments ?? false,
      spent_ms: opts?.spentMs,
    }),
  undo: (id: string) => api.post(`/games/${id}/undo/`),
  matchmaking: (
    mode: string,
    opts?: { is_timed?: boolean; time_minutes?: number | null }
  ) => api.post("/games/matchmaking/", { mode, ...opts }),
  leaveQueue: () => api.delete("/games/matchmaking/"),
  analyze: (id: string) => api.post(`/games/${id}/analyze/`),
  live: () => api.get("/games/live/"),
  offerDraw: (id: string) => api.post(`/games/${id}/draw/`),
  respondDraw: (id: string, accept: boolean) =>
    api.post(`/games/${id}/draw/respond/`, { accept }),
  rematch: (id: string) => api.post(`/games/${id}/rematch/`),
};

export const ratingsApi = {
  me: () => api.get("/ratings/me/"),
  globalLeaderboard: (mode = "blitz") =>
    api.get("/ratings/leaderboard/global/", { params: { mode } }),
  africanLeaderboard: (mode = "blitz", country?: string) =>
    api.get("/ratings/leaderboard/african/", { params: { mode, country } }),
};

export const puzzlesApi = {
  daily: () => api.get("/puzzles/daily/"),
  training: (difficulty: string, count = 10) =>
    api.get("/puzzles/training/", { params: { difficulty, count } }),
  submit: (id: number, moves: string[], time_seconds: number) =>
    api.post(`/puzzles/${id}/submit/`, { moves, time_seconds }),
  leaderboard: () => api.get("/puzzles/leaderboard/"),
  rush: (count = 5) => api.get("/puzzles/rush/", { params: { count } }),
};

export const socialApi = {
  friends: () => api.get("/social/friends/"),
  pendingFriends: () => api.get("/social/friends/pending/"),
  requestFriend: (username: string) =>
    api.post("/social/friends/request/", { username }),
  acceptFriend: (id: number) => api.post(`/social/friends/${id}/accept/`),
  challengeFriend: (username: string, mode = "blitz") =>
    api.post("/social/friends/challenge/", { username, mode }),
  chatHistory: (roomType: string, roomId: string) =>
    api.get(`/social/chat/${roomType}/${roomId}/`),
  sendChat: (roomType: string, roomId: string, message: string) =>
    api.post(`/social/chat/${roomType}/${roomId}/send/`, { message }),
  clubs: (country?: string) =>
    api.get("/social/clubs/", { params: { country } }),
  africanPlayers: () => api.get("/users/featured/african/"),
  directMessages: (username: string) => api.get(`/social/messages/${username}/`),
  sendDirectMessage: (username: string, message: string) =>
    api.post(`/social/messages/${username}/`, { message }),
};

export const notificationsApi = {
  list: () => api.get("/notifications/"),
  markRead: (id: number) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post("/notifications/read-all/"),
};

export const tournamentsApi = {
  list: (african?: boolean) =>
    api.get("/tournaments/", { params: { african: african ? "1" : undefined } }),
  get: (slug: string) => api.get(`/tournaments/${slug}/`),
  register: (slug: string) => api.post(`/tournaments/${slug}/register/`),
  start: (slug: string) => api.post(`/tournaments/${slug}/start/`),
  standings: (slug: string) => api.get(`/tournaments/${slug}/standings/`),
  myGame: (slug: string) => api.get(`/tournaments/${slug}/my-game/`),
};
