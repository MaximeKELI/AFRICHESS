import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  matchmaking: (mode: string) => api.post("/games/matchmaking/", { mode }),
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
};
