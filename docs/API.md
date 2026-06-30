# AFRICHESS API Reference

Interactive docs: `GET /api/docs/` (Swagger UI — admin only in Docker unless `ALLOW_PUBLIC_API_DOCS=true`)

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login `{username, password, totp_code?}` |
| POST | `/api/auth/logout/` | Logout + denylist access token |
| POST | `/api/auth/token/refresh/` | Refresh JWT |
| POST | `/api/users/register/` | Register account |
| POST | `/api/users/auth/oauth/exchange/` | Exchange OAuth `code` → `{access, refresh}` |

OAuth flow: social login redirects to `/auth/callback?code=…`, frontend POSTs code to exchange endpoint.

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/api/users/profile/` | Current user profile |
| GET | `/api/users/<username>/` | Public profile |
| GET | `/api/users/subscription/plans/` | Plans + `analysis_limits` |
| GET | `/api/users/subscription/status/` | Premium tier status |
| POST | `/api/users/subscription/subscribe/` | Stripe checkout or demo |
| POST | `/api/users/subscription/webhook/` | Stripe webhook |
| GET/POST | `/api/users/totp/*` | 2FA setup / enable / disable |

## Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/` | User's games |
| POST | `/api/games/ai/` | Start vs AI `{mode, color, variant?, ai_elo?, bot_slug?}` |
| POST | `/api/games/matchmaking/` | Join queue `{mode, variant?, is_rated, time_control}` |
| DELETE | `/api/games/matchmaking/` | Leave queue |
| GET | `/api/games/<uuid>/` | Game detail |
| POST | `/api/games/<uuid>/move/` | Make move `{uci}` |
| POST | `/api/games/<uuid>/resign/` | Resign |
| POST | `/api/games/<uuid>/abort/` | Abort (≤2 moves) |
| POST | `/api/games/<uuid>/draw/` | Offer draw |
| POST | `/api/games/<uuid>/draw/respond/` | Accept/decline draw |
| POST | `/api/games/<uuid>/takeback/` | Offer takeback (unrated) |
| POST | `/api/games/<uuid>/analyze/` | Sync Stockfish analysis |
| POST | `/api/games/<uuid>/analyze/async/` | Async cloud analysis |
| GET | `/api/games/<uuid>/analyze/status/` | Async job status |
| GET | `/api/games/correspondence/` | Daily chess games |
| POST | `/api/games/correspondence/seek/` | Join daily pool |
| POST | `/api/games/vote/create/` | Vote chess between clubs |
| GET/POST | `/api/games/fairplay/*` | Fair Play consent & appeals |

## WebSocket

| Path | Events |
|------|--------|
| `ws/game/<id>/` | `recevoir_coup`, `proposition_nulle`, `proposition_reprise`, `fin_partie`, `chat` |
| `ws/matchmaking/` | `match_found`, `en_attente` |

Auth: `Sec-WebSocket-Protocol: bearer,<JWT>` (or `?token=` if `WS_ALLOW_QUERY_TOKEN=true`)

## Puzzles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/puzzles/daily/` | Daily puzzle |
| GET | `/api/puzzles/training/` | Training set |
| POST | `/api/puzzles/rush/start/` | Puzzle Rush session |
| POST | `/api/puzzles/custom/` | Create custom puzzle |
| POST | `/api/puzzles/<id>/submit/` | Submit solution |

## Learning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/learning/courses/` | Course list |
| GET | `/api/learning/lessons/<id>/` | Lesson (Premium after lesson 2) |
| GET | `/api/learning/videos/` | Videos (`locked` if premium) |

## Ratings / Social / Tournaments

See existing endpoints in Swagger UI.
