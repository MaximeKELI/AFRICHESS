# ♟️ AFRICHESS

**Africa's Premier Chess Platform** — built to rival global leaders with a strong African identity and world-class engineering.

| | |
|---|---|
| **Developer** | Maxime Dzidula KELI |
| **Contact** | [WhatsApp +33 754830039](https://wa.me/33754830039) |
| **Stack** | Django · DRF · Channels · Next.js · PostgreSQL · Redis · Stockfish |

![AFRICHESS Logo](frontend/public/images/logo.png)

---

## Features

### Core
- **User system** — Registration, JWT auth, OAuth-ready (Google/GitHub), profiles with stats
- **Real-time chess** — WebSocket games, Blitz/Bullet/Rapid, ELO matchmaking
- **Play vs AI** — 10 difficulty levels powered by Stockfish
- **Game analysis** — Best moves, blunder detection
- **ELO ratings** — Per time control, rating history
- **Puzzles** — Daily puzzle + tactical training
- **Social** — Friends, clubs, in-game & room chat

### African Identity
- **African leaderboard** — Filter by country (54 nations)
- **Featured players** — Highlight African talent
- **5 languages** — EN, FR, AR, PT, SW
- **Low-bandwidth mode** — Reduced animations for slower connections
- **Mobile-first** responsive UI

### Bonus
- Tournament system (Swiss, Knockout, Arena)
- Notifications
- Dark / Light themes
- AI-generated branding assets

---

## Project Structure

```
AFRICHESS/
├── backend/                 # Django + DRF + Channels
│   ├── config/              # Settings, ASGI, URLs
│   └── apps/
│       ├── users/           # Auth, profiles, countries
│       ├── games/           # Chess, Stockfish, WebSockets
│       ├── ratings/         # ELO, leaderboards
│       ├── puzzles/         # Daily & training puzzles
│       ├── social/          # Friends, clubs, chat
│       ├── tournaments/     # African Cup, etc.
│       └── notifications/
├── frontend/                # Next.js 14 + TypeScript
│   └── src/
│       ├── app/             # Pages (play, puzzles, leaderboard…)
│       ├── components/      # Chess board, layout
│       └── lib/             # API client, i18n
├── docker-compose.yml
├── docs/
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   └── API.md
└── .env.example
```

---

## Quick Start

```bash
git clone <repo>
cd AFRICHESS
cp .env.example .env
docker compose up --build
```

- **App:** http://localhost:3000
- **API docs:** http://localhost:8000/api/docs/

See [docs/SETUP.md](docs/SETUP.md) for detailed instructions.

---

## Design System

| Token | Color | Usage |
|-------|-------|-------|
| Gold | `#D4A017` | Accents, CTAs |
| Green | `#1B7A3D` | Success, African earth |
| Terracotta | `#C45C26` | Warm highlights |
| Night | `#0D1117` | Dark mode background |

Assets generated with AI: logo, Kente-inspired pattern background.

---

## API & WebSockets

- REST API with OpenAPI/Swagger at `/api/docs/`
- WebSocket game channel: `ws://host/ws/game/<uuid>/`
- Chat channel: `ws://host/ws/chat/<type>/<id>/`

Full reference: [docs/API.md](docs/API.md)

---

## Deployment

Production-ready with Docker. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for AWS, DigitalOcean, and CI/CD guidance.

---

## Roadmap

- [ ] Live game streaming
- [ ] Coach mode (AI move explanations)
- [ ] Anti-cheat engine
- [ ] Mobile apps (React Native)
- [ ] FIDE rating integration

---

## License

Proprietary — © 2026 AFRICHESS / Maxime Dzidula KELI
