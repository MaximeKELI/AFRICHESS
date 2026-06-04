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
  createAI: (data: { mode: string; difficulty: number; color: string }) =>
    api.post("/games/ai/", data),
  aiPreview: (mode: string, difficulty: number) =>
    api.get("/games/ai/preview/", { params: { mode, difficulty } }),
  move: (id: string, uci: string) => api.post(`/games/${id}/move/`, { uci }),
  matchmaking: (mode: string) => api.post("/games/matchmaking/", { mode }),
  leaveQueue: () => api.delete("/games/matchmaking/"),
  analyze: (id: string) => api.post(`/games/${id}/analyze/`),
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
};

export const socialApi = {
  friends: () => api.get("/social/friends/"),
  requestFriend: (username: string) =>
    api.post("/social/friends/request/", { username }),
  clubs: (country?: string) =>
    api.get("/social/clubs/", { params: { country } }),
  africanPlayers: () => api.get("/users/featured/african/"),
};

export const tournamentsApi = {
  list: (african?: boolean) =>
    api.get("/tournaments/", { params: { african: african ? "1" : undefined } }),
};
