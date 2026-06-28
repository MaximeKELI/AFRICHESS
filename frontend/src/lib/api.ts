import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { API_URL } from "@/lib/apiConfig";
import { setAccessToken, setRefreshToken } from "@/lib/cookies";
import { handleSessionExpired } from "@/lib/session";

const API_URL_BASE = API_URL;

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
  "/users/auth/oauth/exchange/",
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
  const { data } = await axios.post<{ access: string; refresh?: string }>(
    `${API_URL_BASE}/auth/token/refresh/`,
    { refresh }
  );
  if (!data.access) throw new Error("Invalid refresh response");
  setAccessToken(data.access);
  // ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION côté backend
  if (data.refresh) {
    setRefreshToken(data.refresh);
  }
  return data.access;
}

/** Renouvelle les tokens avant expiration (parties longues). */
export async function refreshAuthTokens(): Promise<boolean> {
  if (!Cookies.get("refresh_token")) return false;
  try {
    await refreshAccessToken();
    return true;
  } catch {
    return false;
  }
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
  logout: (refresh: string) => api.post("/auth/logout/", { refresh }),
  register: (data: Record<string, string | number>) =>
    api.post("/users/register/", data),
  profile: () => api.get("/users/profile/"),
  updateProfile: (data: Record<string, string> | FormData) =>
    api.patch("/users/profile/", data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined),
};

export const usersApi = {
  get: (username: string) => api.get(`/users/${username}/`),
  subscriptionPlans: () => api.get("/users/subscription/plans/"),
  subscriptionStatus: () => api.get("/users/subscription/status/"),
  subscribe: (plan: "gold" | "diamond") =>
    api.post("/users/subscription/subscribe/", { plan }),
  setVacation: (days: number) => api.post("/users/vacation/", { days }),
  clearVacation: () => api.delete("/users/vacation/"),
};

export const gamesApi = {
  list: () => api.get("/games/"),
  get: (id: string) => api.get(`/games/${id}/`),
  createAI: (data: {
    mode: string;
    color: string;
    ai_elo?: number;
    bot_slug?: string;
    variant?: "standard" | "chess960" | "crazyhouse" | "kingofthehill" | "threecheck";
    include_comments?: boolean;
    is_timed?: boolean;
    time_minutes?: number | null;
    time_control?: string;
  }) => api.post("/games/ai/", data),
  bots: (params?: { q?: string; premium?: boolean }) =>
    api.get("/games/bots/", {
      params: {
        q: params?.q,
        premium: params?.premium === true ? "1" : params?.premium === false ? "0" : undefined,
      },
    }),
  bot: (slug: string) => api.get(`/games/bots/${slug}/`),
  aiPreview: (mode: string, aiElo?: number) =>
    api.get("/games/ai/preview/", {
      params: aiElo != null ? { mode, ai_elo: aiElo } : { mode },
    }),
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
    opts?: {
      is_timed?: boolean;
      time_minutes?: number | null;
      time_control?: string;
      is_rated?: boolean;
    }
  ) => api.post("/games/matchmaking/", { mode, ...opts }),
  leaveQueue: () => api.delete("/games/matchmaking/"),
  analyze: (id: string) => api.post(`/games/${id}/analyze/`),
  analyzeAsync: (id: string) => api.post(`/games/${id}/analyze/async/`),
  analyzeStatus: (id: string) => api.get(`/games/${id}/analyze/status/`),
  tablebase: (fen: string) => api.get("/games/engine/tablebase/", { params: { fen } }),
  engineEval: (fen: string) =>
    api.get<{ evaluation: number | null }>("/games/engine/eval/", { params: { fen } }),
  live: () => api.get("/games/live/"),
  liveTv: () => api.get("/games/live/"),
  legalMoves: (id: string, from?: string) =>
    api.get(`/games/${id}/legal-moves/`, { params: from ? { from } : {} }),
  offerDraw: (id: string) => api.post(`/games/${id}/draw/`),
  respondDraw: (id: string, accept: boolean) =>
    api.post(`/games/${id}/draw/respond/`, { accept }),
  rematch: (id: string) => api.post(`/games/${id}/rematch/`),
  correspondence: () => api.get("/games/correspondence/"),
  correspondenceChallenge: (username: string, days_per_move = 3, color = "white") =>
    api.post("/games/correspondence/challenge/", { username, days_per_move, color }),
  correspondenceSeek: (days_per_move = 3) =>
    api.post("/games/correspondence/seek/", { days_per_move }),
  leaveCorrespondenceQueue: () => api.delete("/games/correspondence/seek/"),
  openingLookup: (moves: string[], lang?: string) =>
    api.get("/games/openings/lookup/", {
      params: { moves: moves.join(","), lang },
    }),
  simulList: () => api.get("/games/simul/"),
  createSimul: (title: string, max_boards = 10) =>
    api.post("/games/simul/", { title, max_boards }),
  joinSimul: (id: number) => api.post(`/games/simul/${id}/join/`),
  createVoteGame: (club_white: string, club_black: string, mode = "rapid") =>
    api.post("/games/vote/create/", { club_white, club_black, mode }),
  castVote: (gameId: string, move_uci: string) =>
    api.post(`/games/${gameId}/vote/`, { move_uci }),
  applyVote: (gameId: string) => api.post(`/games/${gameId}/vote/apply/`),
};

export const statsApi = {
  me: () => api.get("/stats/me/"),
};

export const adminApi = {
  overview: () => api.get("/analytics/admin/overview/"),
  registrations: () => api.get("/analytics/admin/registrations/"),
  users: (params?: { q?: string; limit?: number; offset?: number }) =>
    api.get("/analytics/admin/users/", { params }),
  userDetail: (id: number, params?: { limit?: number; offset?: number }) =>
    api.get(`/analytics/admin/users/${id}/`, { params }),
};

export const ratingsApi = {
  me: () => api.get("/ratings/me/"),
  user: (username: string) => api.get(`/ratings/user/${username}/`),
  globalLeaderboard: (mode = "blitz") =>
    api.get("/ratings/leaderboard/global/", { params: { mode } }),
  africanLeaderboard: (mode = "blitz", country?: string) =>
    api.get("/ratings/leaderboard/african/", { params: { mode, country } }),
  league: () => api.get("/ratings/league/"),
  leagueStandings: (tier?: string) =>
    api.get("/ratings/league/standings/", { params: { tier } }),
  myLeague: () => api.get("/ratings/league/me/"),
};

export const puzzlesApi = {
  daily: () => api.get("/puzzles/daily/"),
  training: (difficulty: string, count = 10) =>
    api.get("/puzzles/training/", { params: { difficulty, count } }),
  submit: (id: number, moves: string[], time_seconds: number) =>
    api.post(`/puzzles/${id}/submit/`, { moves, time_seconds }),
  leaderboard: () => api.get("/puzzles/leaderboard/"),
  rush: (count = 15) => api.get("/puzzles/rush/", { params: { count } }),
  rushStart: () => api.post("/puzzles/rush/start/"),
  rushSubmit: (sessionId: number, moves: string[], time_seconds: number) =>
    api.post(`/puzzles/rush/${sessionId}/submit/`, { moves, time_seconds }),
  rushLeaderboard: () => api.get("/puzzles/rush/leaderboard/"),
  battleQueue: () => api.post("/puzzles/battle/queue/"),
  battleLeave: () => api.delete("/puzzles/battle/queue/"),
  battleGet: (id: number) => api.get(`/puzzles/battle/${id}/`),
  battleSubmit: (id: number, moves: string[], time_seconds: number) =>
    api.post(`/puzzles/battle/${id}/`, { moves, time_seconds }),
  createCustom: (data: { fen: string; solution_moves: string[]; themes?: string[]; is_public?: boolean }) =>
    api.post("/puzzles/custom/", data),
  customMine: () => api.get("/puzzles/custom/"),
  streak: () => api.get("/puzzles/streak/"),
};

export interface UserRelationship {
  user: {
    id: number;
    username: string;
    display_name: string;
    country: string;
    avatar?: string | null;
  };
  friendship_status: "none" | "friends" | "pending_sent" | "pending_received" | "blocked" | "self";
  friendship_id: number | null;
  is_following: boolean;
  is_followed_by: boolean;
  followers_count: number;
  following_count: number;
  can_message: boolean;
  can_friend: boolean;
}

export interface UserSearchHit {
  user: {
    id: number;
    username: string;
    display_name: string;
    country: string;
    avatar?: string | null;
    title?: string;
  };
  blitz_elo: number | null;
  relationship: Omit<UserRelationship, "user">;
}

export const socialApi = {
  friends: () => api.get("/social/friends/"),
  pendingFriends: () => api.get("/social/friends/pending/"),
  sentFriends: () => api.get("/social/friends/sent/"),
  requestFriend: (username: string) =>
    api.post("/social/friends/request/", { username }),
  acceptFriend: (id: number) => api.post(`/social/friends/${id}/accept/`),
  declineFriend: (id: number) => api.post(`/social/friends/${id}/decline/`),
  cancelFriendRequest: (id: number) => api.post(`/social/friends/${id}/cancel/`),
  unfriend: (username: string) => api.post(`/social/friends/unfriend/${username}/`),
  blockUser: (username: string) => api.post(`/social/friends/block/${username}/`),
  searchUsers: async (q: string, country?: string) => {
    const params = { q, country };
    try {
      return await api.get<UserSearchHit[]>("/users/search/", { params });
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        return api.get<UserSearchHit[]>("/social/users/search/", { params });
      }
      throw err;
    }
  },
  userRelationship: (username: string) =>
    api.get<UserRelationship>(`/social/users/${username}/relationship/`),
  followUser: (username: string) => api.post(`/social/users/${username}/follow/`),
  unfollowUser: (username: string) => api.post(`/social/users/${username}/unfollow/`),
  followers: (username: string) => api.get(`/social/users/${username}/followers/`),
  following: (username: string) => api.get(`/social/users/${username}/following/`),
  challengeFriend: (username: string, mode = "blitz", opts?: { odds?: string; is_rated?: boolean }) =>
    api.post("/social/friends/challenge/", { username, mode, ...opts }),
  chatHistory: (roomType: string, roomId: string) =>
    api.get(`/social/chat/${roomType}/${roomId}/`),
  sendChat: (roomType: string, roomId: string, message: string) =>
    api.post(`/social/chat/${roomType}/${roomId}/send/`, { message }),
  clubs: (country?: string) =>
    api.get("/social/clubs/", { params: { country } }),
  club: (slug: string) => api.get(`/social/clubs/${slug}/`),
  joinClub: (slug: string) => api.post(`/social/clubs/${slug}/join/`),
  clubEvents: (slug: string) => api.get(`/social/clubs/${slug}/events/`),
  createClubEvent: (slug: string, data: { title: string; description?: string; event_type?: string; starts_at?: string }) =>
    api.post(`/social/clubs/${slug}/events/`, data),
  clubArena: (slug: string, opponent_club: string, mode = "blitz") =>
    api.post(`/social/clubs/${slug}/arena/`, { opponent_club, mode }),
  createClub: (data: { name: string; description?: string; country?: string }) =>
    api.post("/social/clubs/", data),
  forum: (params?: { featured?: boolean; category?: string }) =>
    api.get("/social/forum/", { params: { featured: params?.featured ? "1" : undefined, category: params?.category } }),
  forumPost: (id: number) => api.get(`/social/forum/${id}/`),
  forumComment: (id: number, body: string) =>
    api.post(`/social/forum/${id}/comment/`, { body }),
  forumLike: (id: number) => api.post(`/social/forum/${id}/like/`),
  createForumPost: (data: { title: string; body: string; category?: string }) =>
    api.post("/social/forum/", data),
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
