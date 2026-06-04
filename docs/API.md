# AFRICHESS API Reference

Interactive docs: `GET /api/docs/` (Swagger UI)

## Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register/` | Register new account |
| GET/PATCH | `/api/users/profile/` | Current user profile |
| GET | `/api/users/<username>/` | Public profile |
| GET | `/api/users/featured/african/` | Featured African players |
| GET | `/api/users/meta/countries/` | Country list |

## Games

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/` | User's games |
| POST | `/api/games/ai/` | Start vs AI `{mode, difficulty, color}` |
| POST | `/api/games/matchmaking/` | Join ELO queue |
| DELETE | `/api/games/matchmaking/` | Leave queue |
| GET | `/api/games/<uuid>/` | Game detail |
| POST | `/api/games/<uuid>/move/` | Make move `{uci}` |
| POST | `/api/games/<uuid>/analyze/` | Stockfish analysis |
| GET | `/api/games/engine/eval/?fen=` | Position evaluation |

## Ratings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ratings/me/` | My ratings by mode |
| GET | `/api/ratings/leaderboard/global/?mode=blitz` | Global top 100 |
| GET | `/api/ratings/leaderboard/african/?mode=blitz&country=NG` | African leaderboard |
| GET | `/api/ratings/leaderboard/country/<code>/` | Per-country |

## Puzzles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/puzzles/daily/` | Daily puzzle |
| GET | `/api/puzzles/training/?difficulty=medium` | Training set |
| POST | `/api/puzzles/<id>/submit/` | Submit solution |

## Social

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/friends/` | Friends list |
| POST | `/api/social/friends/request/` | Send request |
| GET/POST | `/api/social/clubs/` | List/create clubs |
| POST | `/api/social/clubs/<slug>/join/` | Join club |

## Tournaments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tournaments/?african=1` | List tournaments |
| POST | `/api/tournaments/<slug>/register/` | Register |

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/` | List notifications |
| POST | `/api/notifications/read-all/` | Mark all read |
