# AFRICHESS API Reference

Interactive docs: `GET /api/docs/` (Swagger UI — admin only in Docker unless `ALLOW_PUBLIC_API_DOCS=true`)

Public health: `GET /api/health/` — no auth, for load balancers.

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login `{username, password, totp_code?}` |
| POST | `/api/auth/logout/` | Logout + denylist access/refresh (body `{refresh}` or cookie HttpOnly) |
| POST | `/api/auth/token/refresh/` | Refresh JWT — body `{refresh}` or cookie `refresh_token` if `JWT_REFRESH_HTTPONLY=true` |
| POST | `/api/users/register/` | Register account |
| POST | `/api/users/auth/oauth/exchange/` | Exchange OAuth `code` → `{access, refresh}` (`totp_code` if 2FA). Mobile: `?next=africhess://auth/callback` |

OAuth flow: social login redirects to `/auth/callback?code=…`, frontend POSTs code (and TOTP if needed) to exchange endpoint.

**HttpOnly refresh (Phase 10, optional):** set `JWT_REFRESH_HTTPONLY=true` (backend) and `NEXT_PUBLIC_JWT_REFRESH_HTTPONLY=true` (frontend). Login/register/oauth responses omit `refresh` in JSON; the token is set as `Set-Cookie: refresh_token` (HttpOnly). Frontend must use `withCredentials` on refresh/logout. Mobile apps keep body-based refresh.

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/api/users/profile/` | Current user profile |
| GET | `/api/users/<username>/` | Public profile |
| GET | `/api/users/subscription/plans/` | Plans + `analysis_limits` |
| GET | `/api/users/subscription/status/` | Premium tier status |
| POST | `/api/users/subscription/subscribe/` | Stripe checkout or demo |
| POST | `/api/users/subscription/webhook/` | Stripe webhook |
| GET | `/api/users/security/2fa/status/` | 2FA status |
| POST | `/api/users/security/2fa/setup/` | Generate TOTP secret |
| POST | `/api/users/security/2fa/enable/` | Enable 2FA `{code}` |
| POST | `/api/users/security/2fa/disable/` | Disable 2FA `{code}` |

## Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/` | User's games |
| POST | `/api/games/ai/` | Start vs AI `{mode, color, variant?, ai_elo?, bot_slug?}` |
| POST | `/api/games/matchmaking/` | Join queue `{mode, variant?, is_rated, time_control}` |
| DELETE | `/api/games/matchmaking/` | Leave queue |
| GET | `/api/games/<uuid>/` | Game detail |
| POST | `/api/games/<uuid>/move/` | Make move `{uci, spent_ms?, telemetry?}` |
| POST | `/api/games/<uuid>/resign/` | Resign |
| POST | `/api/games/<uuid>/abort/` | Abort (≤2 moves) |
| POST | `/api/games/<uuid>/draw/` | Offer draw |
| POST | `/api/games/<uuid>/draw/respond/` | Accept/decline draw |
| POST | `/api/games/<uuid>/takeback/` | Offer takeback (unrated) |
| POST | `/api/games/<uuid>/analyze/` | Sync Stockfish analysis (tier move limit) |
| POST | `/api/games/<uuid>/analyze/async/` | Async cloud analysis (same tier limits) |
| GET | `/api/games/<uuid>/analyze/status/` | Async job status |
| GET | `/api/games/correspondence/` | Daily chess games |
| POST | `/api/games/correspondence/seek/` | Join daily pool |
| POST | `/api/games/correspondence/challenge/` | Challenge friend (daily) |
| POST | `/api/games/vote/create/` | Vote chess between clubs |
| GET | `/api/games/fairplay/status/` | Fair Play consent status |
| POST | `/api/games/fairplay/consent/` | Accept Fair Play |
| DELETE | `/api/games/fairplay/consent/` | Revoke consent |
| POST | `/api/games/fairplay/appeals/` | Submit appeal |

## WebSocket

| Path | Events |
|------|--------|
| `ws/game/<id>/` | In: `jouer_coup`, `abandonner_partie`, `proposer_nulle`, `chat` — Out: `recevoir_coup`, `proposition_nulle`, `proposition_reprise`, `fin_partie`, `game_state`, `chat` |
| `ws/matchmaking/` | `rejoindre_file`, `match_found`, `en_attente` |
| `ws/notifications/` | Push notifications |
| `ws/chat/<room_type>/<room_id>/` | Room chat |

Auth: `Sec-WebSocket-Protocol: bearer,<JWT>` (or `?token=` if `WS_ALLOW_QUERY_TOKEN=true`)

## Puzzles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/puzzles/daily/` | Daily puzzle |
| GET | `/api/puzzles/training/` | Training set |
| POST | `/api/puzzles/rush/start/` | Puzzle Rush session |
| GET/POST | `/api/puzzles/custom/` | List (GET) / create (POST) custom puzzles |
| POST | `/api/puzzles/<id>/submit/` | Submit solution |

## Learning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/learning/courses/` | Course list |
| GET | `/api/learning/courses/<slug>/` | Course detail (premium lessons redacted) |
| GET | `/api/learning/lessons/<id>/` | Lesson detail (403 if premium locked) |
| POST | `/api/learning/courses/<slug>/complete-lesson/` | Mark lesson complete |
| GET | `/api/learning/videos/` | Videos (`locked` if premium) |

## Ratings / Social / Tournaments

See Swagger at `/api/docs/` for full surface (`/api/ratings/`, `/api/social/`, `/api/tournaments/`, `/api/analytics/`, `/api/stats/`).
