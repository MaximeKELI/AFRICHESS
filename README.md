<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0D1117,50:1B7A3D,100:D4A017&height=220&section=header&text=AFRICHESS&fontSize=58&fontColor=ffffff&animation=twinkling" alt="AFRICHESS" />

<br />

<img src="frontend/public/images/logo.png" alt="Logo AFRICHESS" width="128" />

<br />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=20&duration=3800&pause=900&color=67E8F9&center=true&vCenter=true&width=640&lines=GLOBAL+CHESS+INFRASTRUCTURE;PLAY+%C2%B7+TRAIN+%C2%B7+COMPETE;REAL-TIME+%C2%B7+STOCKFISH+%C2%B7+40-LESSON+CURRICULUM" alt="tagline" />

<br />

[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-0D1117?style=for-the-badge&logo=next.js&logoColor=D4A017)](https://nextjs.org/)
[![WebSocket](https://img.shields.io/badge/Channels-Real--time-1B7A3D?style=for-the-badge)](docs/WEBSOCKET_MULTIPLAYER.md)
[![Stockfish](https://img.shields.io/badge/Stockfish-Engine-6B4226?style=for-the-badge)](https://stockfishchess.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
[![CI](https://img.shields.io/badge/CI-280%2B_tests-D4A017?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)

<br />

**Plateforme d'échecs en ligne** — identité visuelle africaine, ingénierie temps réel, ouverte au monde entier.

<br />

| | |
|:---:|:---|
| **Architecte** | Maxime Dzidula KELI |
| **Contact** | [WhatsApp +33 7 54 83 00 39](https://wa.me/33754830039) |
| **Application** | [localhost:3000](http://localhost:3000) |
| **API / Swagger** | [localhost:8000/api/docs/](http://localhost:8000/api/docs/) |

<br />

[`Comparatif`](#comparatif-rigoureux--africhess-vs-chesscom) · [`Démarrage`](#démarrage) · [`Architecture`](#architecture) · [`Fonctionnalités`](#fonctionnalités) · [`Flux temps réel`](#flux-temps-réel) · [`API`](#api--websocket) · [`Design`](#design-system) · [`Routes`](#routes) · [`Docs`](#documentation) · [`Roadmap`](#roadmap)

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=67E8F9" />

</div>

---

## Vision

**AFRICHESS** construit une couche logicielle complète autour des échecs : jeu humain synchronisé, entraînement tactique, parcours pédagogique, tournois et réseau social — avec une expérience comparable aux grandes plateformes internationales, ancrée dans une esthétique et une communauté africaines.

```mermaid
mindmap
  root((AFRICHESS))
    Play
      WebSocket live
      Matchmaking ELO
      Stockfish 10 niveaux
      Analyse post-partie
    Train
      10 000+ puzzles
      Daily / Rush / Survival
      Curriculum 40 leçons
      Coach IA
    Compete
      Tournois arène / suisse
      Classements mondiaux
      Filtre africain
    Connect
      Amis & DM
      Clubs par pays
      Notifications push WS
```

---

## Comparatif rigoureux — AFRICHESS vs Chess.com

Analyse **HEAD** (état actuel du dépôt, juin 2026) contre **Chess.com** (référence marché). Méthode : audit code (54 routes web, 9 apps Django, app Expo), pas marketing.

### Méthodologie

| Élément | Détail |
|---------|--------|
| **Périmètre AFRICHESS** | Web Next.js 14 · API Django 5 · mobile Expo · anticheat C++ |
| **Périmètre Chess.com** | Produit public 2025–2026 (Free + Diamond) |
| **Échelle de maturité** | 0 absent · 1 stub · 2 partiel · 3 fonctionnel · 4 mature · 5 référence marché |
| **Statut implémentation** | `OK` livré · `PART` partiel · `STUB` incomplet · `N/A` hors périmètre |

Scores par axe (0–5) : moyenne pondérée des critères audités. Chess.com = 5 lorsque c'est le standard de facto du segment.

### Synthèse chiffrée

| Axe | Poids | AFRICHESS | Chess.com | Écart |
|-----|-------|-----------|-----------|-------|
| Jeu en direct | 20 % | **3,6** | **5,0** | −1,4 |
| Puzzles & drills | 15 % | **3,4** | **5,0** | −1,6 |
| Apprentissage | 15 % | **2,8** | **5,0** | −2,2 |
| Social & clubs | 12 % | **3,2** | **5,0** | −1,8 |
| Compétition | 10 % | **3,0** | **5,0** | −2,0 |
| Mobile | 10 % | **2,5** | **5,0** | −2,5 |
| Anti-triche & fair play | 8 % | **2,4** | **5,0** | −2,6 |
| Produit & infra | 10 % | **3,8** | **5,0** | −1,2 |
| **Score global pondéré** | 100 % | **3,2 / 5** | **5,0 / 5** | **~64 %** du périmètre mature |

```mermaid
%%{init: {"theme": "dark", "themeVariables": {"primaryColor": "#1B7A3D", "lineColor": "#67E8F9"}}}%%
xychart-beta
    title "Maturité par axe (0–5)"
    x-axis ["Jeu", "Puzzles", "Learning", "Social", "Compétition", "Mobile", "Fair play", "Produit"]
    y-axis "Score" 0 --> 5
    bar "AFRICHESS" [3.6, 3.4, 2.8, 3.2, 3.0, 2.5, 2.4, 3.8]
    bar "Chess.com" [5, 5, 5, 5, 5, 5, 5, 5]
```

### Matrice de parité fonctionnelle

| Domaine | Critère | AFRICHESS | Chess.com | Verdict |
|---------|---------|-----------|-----------|---------|
| **Jeu** | Bullet / Blitz / Rapid | OK presets + WS | OK pools mondiaux | **Parité fonctionnelle** · écart = liquidité joueurs |
| | Daily / correspondence | OK seek + vacation API | OK app + notifications push | **Parité** · Chess.com plus poli mobile |
| | Vs bots | OK catalogue + premium bots | OK 60+ bots personnalisés | **Chess.com +** profondeur catalogue |
| | Variantes (960, Crazyhouse, KOTH…) | OK `VariantPicker` | OK large choix | **Parité** variantes courantes |
| | Vote chess | STUB création sans UI vote in-game | OK clubs vote chess | **Chess.com +** |
| | Simultané | PART join → 1v1 isolé | OK multi-board host | **Chess.com +** |
| | Chrono serveur Fischer | OK authoritative | OK + intégré fair play | **Parité technique** |
| | Analyse post-partie | OK Stockfish auto background + Game Review | OK Game Review IA premium | **Chess.com +** profondeur IA |
| | Spectateur | OK `/live` + `/watch` | OK TV + millions de vues | **Parité** · écart audience |
| **Puzzles** | Catalogue | OK ~10 000+ (seed Lichess) | OK millions | **Chess.com +** volume |
| | Daily + streak | OK | OK | **Parité** |
| | Training thématique | OK lots + ELO puzzle | OK paths + rating puzzle | **Parité** cœur produit |
| | Rush / Survival / Battle | OK 4 modes | OK Rush + Battle | **Parité** modes compétitifs |
| | UX (indices, bilan session) | OK flèche · jardin · recap | OK hints · streak · themes | **Parité UX** · styles différents |
| | Puzzle builder | OK `/puzzles/build` + API custom | OK création + partage | **Parité** |
| | Vision / coordinates | OK `/training/vision` | OK drills dédiés | **Parité** basique |
| | Fins de partie | PART 3 positions statiques | OK tablebases + drills | **Chess.com +** |
| **Learning** | Cours structurés | OK 40 docs FR + seed | OK centaines de leçons | **Chess.com +** volume |
| | Opening explorer | OK lookup API | OK millions de parties | **Chess.com +** data |
| | PGN analyze | OK Stockfish classify | OK analyse cloud profonde | **Parité** · Chess.com plus profond |
| | Vidéos | PART placeholders YouTube | OK bibliothèque + streamers | **Chess.com +** |
| | Répertoires | OK CRUD lignes SAN | OK builder intégré | **Parité** · UX Chess.com supérieure |
| | Classroom | PART board read-only + poll | OK ChessKid / clubs outils | **Chess.com +** |
| | Coach IA | OK dashboard + insights | OK Coach premium contextuel | **Chess.com +** |
| **Social** | Amis + défis | OK odds + modes | OK | **Parité** |
| | DM | OK REST polling | OK temps réel + groupes | **Parité** · Chess.com plus fluide |
| | Chat partie / club WS | OK | OK modération à échelle | **Parité technique** |
| | Clubs | OK par pays + events | OK 500k+ clubs + league | **Chess.com +** échelle |
| | Forum / blog | OK community + blog | OK forums + news | **Parité** |
| | Classement africain | OK filtre pays dédié | N/A pas de focus régional | **AFRICHESS +** différenciation |
| **Compétition** | Tournois arène / suisse | OK register · standings | OK officiels + prize pools | **Chess.com +** écosystème pro |
| | Leagues | OK 8 tiers saisonniers | OK leagues intégrées | **Parité** concept |
| | Leaderboard ELO | OK global + african + pays | OK global + national | **Parité** · AFRICHESS + filtre Afrique |
| | Events calendrier | OK platform events | OK événements titled | **Parité** légère · Chess.com + prestige |
| **Mobile** | App native | PART Expo (play · daily · puzzles partiels) | OK iOS/Android matures | **Chess.com +** |
| | Push notifications | OK APNs/FCM (Expo) + Web Push VAPID | OK APNs / FCM | **Parité** |
| | Parité web/mobile | ~40 % des modules web | OK quasi-complète | **Chess.com +** |
| **Fair play** | Télémétrie client | OK tab-blur · paste · cadence | OK Fair Play avancé | **Chess.com +** |
| | Moteur post-partie | OK C++ + review admin | OK détection moteur à échelle | **Chess.com +** |
| | Sanctions automatiques | PART review humaine admin | OK bans · shadow · pools | **Chess.com +** |
| **Produit** | Auth JWT + OAuth + 2FA | OK | OK + recovery mature | **Parité** sécurité |
| | i18n | PART FR/EN complets · AR/PT/SW overlays | OK 20+ langues | **Chess.com +** |
| | Premium / Stripe | OK Checkout · webhooks · portail client | OK modèle éprouvé | **Parité** modèle · Chess.com + revenus |
| | PWA low-bandwidth | OK | N/A app-first | **AFRICHESS +** web léger |
| | API Swagger documentée | OK | N/A fermé | **AFRICHESS +** transparence dev |
| | CI 280+ tests + E2E | OK | OK QA massive | **Parité** approche · Chess.com + scale QA |

### Analyse par couche technique

```mermaid
flowchart TB
    subgraph COMPARE["Comparaison architecture"]
        direction LR
        subgraph AF["AFRICHESS"]
            AF1[Next.js 14 · 54 routes]
            AF2[Django 9 apps · Channels]
            AF3[Celery matchmaking 5s]
            AF4[Stockfish local]
            AF5[Expo mobile partiel]
        end
        subgraph CC["Chess.com"]
            CC1[Stack propriétaire]
            CC2[Microservices à échelle]
            CC3[Pools mondiaux instantanés]
            CC4[Cloud analysis farm]
            CC5[Apps natives complètes]
        end
    end
    AF1 -.->|"parité UX moderne"| CC1
    AF2 -.->|"parité REST+WS"| CC2
    AF3 -.->|"gap liquidité"| CC3
    AF4 -.->|"gap profondeur cloud"| CC4
    AF5 -.->|"gap couverture"| CC5
```

| Couche | AFRICHESS (factuel) | Chess.com | Évaluation |
|--------|---------------------|-----------|------------|
| **Temps réel** | 4 canaux WS (game · MM · chat · notifs) | WS propriétaire global | Architecture **équivalente** |
| **Matchmaking** | Celery 5 s · ELO par mode | Sub-second · pools régionaux | **Gap** latence + profondeur file |
| **Données openings** | Lookup API interne | MegaBase millions parties | **Gap** data |
| **Contenu pédagogique** | 40 leçons FR seedées | Catalogue massif multilingue | **Gap** contenu |
| **Observabilité** | Admin analytics + fairplay queue | Ops à grande échelle | **Gap** maturité ops |
| **Déploiement** | Docker Compose documenté | Infra multi-région | **Gap** scale prod |

### Lacunes avérées AFRICHESS (audit code)

| Priorité | Lacune | Preuve |
|----------|--------|--------|
| Haute | Liquidité matchmaking | Friction n°1 — **Redis livré** |
| Moyenne | Simul = join 1v1, pas tableau simultané | `simul/page.tsx` + `extra_views.py` |
| Moyenne | Vidéos learning = URLs placeholder | `learning/i18n_meta.py` |
| Moyenne | Mobile ~40 % du web | Expo : pas battle/survival/training/DM/clubs |
| Basse | i18n AR/PT/SW = overlays partiels | `localeOverlays.ts` vs catalogue FR/EN complet |
| Basse | Glossaire FR statique 20 termes | `learning/glossary/page.tsx` |
| Basse | Endgames trainer 3 positions | `training/endgames/page.tsx` hardcodé |

### Avantages différenciants AFRICHESS

| Avantage | Détail | Chess.com |
|----------|--------|-----------|
| **Focus Afrique** | Classement africain · clubs par pays · `/community` talents | Pas de produit régional dédié |
| **Stack ouverte** | Django · Next.js · Swagger · dépôt auditable | Propriétaire fermé |
| **PWA low-bandwidth** | Mode faible bande passante explicite | Orienté apps natives |
| **Fair play transparent** | Pipeline C++ + panel admin review visible | Processus opaque côté user |
| **UX puzzle signature** | Jardin célébration · bilan session · flèche indice | UX Chess.com standard |
| **Coût d'entrée dev** | `docker compose up` + hybrid dev documenté | N/A |

### Où AFRICHESS atteint la parité (cœur produit)

```mermaid
quadrantChart
    title Parité vs Chess.com par segment
    x-axis Faible parité --> Parité forte
    y-axis Périphérique --> Core produit
    quadrant-1 Core · parité forte
    quadrant-2 Core · gap contenu
    quadrant-3 Périphérique · gap
    quadrant-4 Périphérique · parité
    PvP live: [0.75, 0.85]
    Puzzles tactiques: [0.70, 0.80]
    Auth securite: [0.80, 0.55]
    Stats exports: [0.75, 0.50]
    Learning volume: [0.25, 0.75]
    Anti-cheat scale: [0.20, 0.80]
    Mobile native: [0.15, 0.70]
    Tournois pro: [0.35, 0.65]
    Focus Afrique: [0.95, 0.45]
```

Segments **à parité fonctionnelle** (joueur casual → intermédiaire) :
- Partie en direct humain ou IA avec chrono serveur
- Puzzles daily · training · rush · battle · survival
- Amis · défis · DM · chat · clubs
- Stats · exports · achievements · ELO multi-mode
- Auth OAuth · 2FA · notifications WS

Segments **où Chess.com domine** :
- Volume contenu (puzzles, leçons, openings, bots)
- Liquidité matchmaking et tournois titled
- Mobile natif + push
- Anti-triche automatique à échelle
- Game Review IA profonde (premium)
- Analyse Stockfish automatique en background à la fin de partie

### Verdict

| Question | Réponse |
|----------|---------|
| AFRICHESS remplace-t-il Chess.com aujourd'hui ? | **Non** — écarts contenu, scale, mobile, fair play automatique |
| Couvre-t-il le parcours joueur standard ? | **Oui** — jouer · s'entraîner · progresser · socialiser · compétition amateur |
| Score de maturité relative | **~64 %** du périmètre Chess.com (score pondéré 3,2/5 vs 5/5) |
| Positionnement | Alternative régionale modern stack, pas clone 1:1 |
| Prochaines priorités pour réduire l'écart | Vote UI · mobile parité · i18n complet · anti-triche auto · +20 leçons |

> Cette comparaison est **rigoureuse et conservative** : un critère n'est marqué `OK` que si route + API + UX minimale existent dans le dépôt. Les scores Chess.com reflètent le leader du marché, pas une note de qualité absolue d'AFRICHESS.

<details>
<summary><strong>Historique v0.1 (premier MVP — contexte)</strong></summary>

| | v0.1 | Actuel |
|---|------|--------|
| Routes | 6 | 54 |
| Transport | REST seul | REST + 4 WebSockets |
| Puzzles | Daily · 3 seed | 7 modes · 10 000+ |
| Social | — | Amis · clubs · forum |
| Score estimé vs Chess.com | ~15 % | ~64 % |

</details>

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=67E8F9" />

---

## Démarrage

### Prérequis

| Ressource | Version | Port |
|-----------|---------|------|
| Docker + Compose | récent | — |
| Node.js | 20+ | 3000 (front) |
| Python | 3.12+ | 8000 (API) |
| PostgreSQL | 16 | 5433 |
| Redis | 7 | 6379 |

### Une commande — dev hybride (recommandé)

Backend containerisé, frontend local avec hot-reload :

```bash
docker compose up -d db redis backend && cd frontend && npm run dev
```

Première installation frontend : `cd frontend && npm install`

Cache Next.js corrompu (page blanche, 404 assets) :

```bash
cd frontend && npm run dev:clean
```

> **Attention** — ne pas lancer simultanément le conteneur `frontend` Docker et `npm run dev` local : conflit sur le port **3000**.

### Stack complète Docker

```bash
git clone <votre-repo> AFRICHESS && cd AFRICHESS
cp .env.example .env
docker compose up --build
```

### Pipeline de bootstrap

```mermaid
flowchart LR
    A[git clone] --> B[cp .env.example .env]
    B --> C{Mode}
    C -->|Dev hybride| D[docker compose up -d db redis backend]
    C -->|Full Docker| E[docker compose up --build]
    D --> F[npm run dev]
    E --> G[localhost:3000]
    F --> G
    G --> H[seed optionnel]
    H --> I[Application prête]
```

### Endpoints locaux

| Service | URL |
|---------|-----|
| Application | http://localhost:3000 |
| API REST | http://localhost:8000/api/ |
| Swagger UI | http://localhost:8000/api/docs/ |
| Admin Django | http://localhost:8000/admin/ |

### Données de démo

```bash
docker compose exec backend python manage.py seed_puzzles --download   # 10 000+ puzzles (Lichess CC0)
docker compose exec backend python manage.py seed_learning
docker compose exec backend python manage.py seed_full_curriculum      # 40 leçons long format
docker compose exec backend python manage.py seed_tournaments
docker compose exec backend python manage.py createsuperuser
```

### Variables frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_ORIGIN=http://localhost:8000
NEXT_PUBLIC_MEDIA_ORIGIN=http://localhost:8000
```

### Tests

```bash
# Backend — 10 apps Django
docker compose exec backend python manage.py test \
  apps.analytics.tests apps.games.tests apps.notifications.tests \
  apps.social.tests apps.tournaments.tests apps.learning.tests \
  apps.users.tests apps.ratings.tests apps.puzzles.tests

# Frontend unitaire
cd frontend && npm run test

# E2E Playwright (backend + frontend actifs)
cd frontend && npm ci && npx playwright install chromium
npm run test:e2e
```

<details>
<summary><strong>Développement sans Docker</strong></summary>

Guide complet : [docs/SETUP.md](docs/SETUP.md)

| Composant | Commande |
|-----------|----------|
| Backend | `pip install -r backend/requirements.txt` puis `daphne config.asgi:application` |
| Frontend | `cd frontend && npm install && npm run dev` |
| Celery worker | `celery -A config worker -l info` |
| Celery beat | `celery -A config beat -l info` |
| Stockfish | `STOCKFISH_PATH=/usr/games/stockfish` |

</details>

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=1B7A3D" />

---

## Architecture

### Vue système

```mermaid
flowchart TB
    subgraph CLIENT["CLIENT LAYER — Next.js 14 / Expo"]
        WEB[Web App Router]
        MOB[Mobile Expo]
        WS_C[WebSocket hooks]
        ZST[Zustand stores]
    end

    subgraph EDGE["EDGE — Daphne ASGI"]
        REST[REST /api/*]
        WSS[WebSocket /ws/*]
    end

    subgraph CORE["CORE — Django 5 Apps"]
        U[users]
        G[games + Stockfish]
        R[ratings]
        PU[puzzles]
        SO[social]
        TO[tournaments]
        NO[notifications]
        LE[learning]
        AN[analytics]
    end

    subgraph DATA["DATA PLANE"]
        PG[(PostgreSQL 16)]
        RD[(Redis 7)]
    end

    subgraph ASYNC["ASYNC — Celery"]
        BEAT[beat: matchmaking · forfeit]
        WRK[worker tasks]
    end

    WEB --> REST
    MOB --> REST
    WS_C --> WSS
    REST --> CORE
    WSS --> CORE
    CORE --> PG
    CORE --> RD
    BEAT --> WRK
    WRK --> G
    WRK --> TO
```

### Stack technique

```mermaid
flowchart LR
    subgraph Presentation
        N[Next.js 14]
        T[Tailwind CSS]
        F[Framer Motion]
    end
    subgraph Application
        D[Django 5]
        DRF[DRF]
        CH[Channels 4]
    end
    subgraph Intelligence
        SF[Stockfish]
        AC[Anticheat C++]
    end
    subgraph Persistence
        PG[(PostgreSQL)]
        RD[(Redis)]
    end
    N --> DRF
    N --> CH
    D --> SF
    G --> AC
```

### Structure du dépôt

```
AFRICHESS/
├── backend/
│   ├── config/                 settings · ASGI · URLs · Celery
│   └── apps/
│       ├── users/                JWT · OAuth · profils · 2FA TOTP
│       ├── games/                parties · WS · chrono Fischer · IA
│       ├── ratings/              ELO multi-mode · leaderboards
│       ├── puzzles/              daily · training · rush · battle · survival
│       ├── social/               amis · clubs · chat · DM
│       ├── tournaments/          arène · suisse · standings
│       ├── notifications/        REST + push WebSocket
│       ├── learning/             cours · 40 docs · coach · PGN
│       └── analytics/            métriques · événements
├── frontend/
│   ├── src/app/                  App Router (pages)
│   ├── src/components/           échiquier · puzzles · learning
│   ├── src/lib/                  API · WS · moteur puzzle · i18n
│   └── e2e/                      Playwright
├── mobile/                       Expo — play · puzzles · daily
├── anticheat-cpp/                moteur Fair Play post-partie
├── docker-compose.yml
├── .github/workflows/ci.yml
└── docs/
```

### Services Docker

| Service | Image / build | Rôle |
|---------|---------------|------|
| `db` | PostgreSQL 16 | Persistance relationnelle |
| `redis` | Redis 7 | Channels layer · broker Celery |
| `backend` | Django + Daphne | HTTP REST + WebSocket |
| `celery` | worker | tâches asynchrones |
| `celery-beat` | scheduler | matchmaking 5s · forfaits déconnexion |
| `frontend` | Next.js 14 | UI production (port 3000) |

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=D4A017" />

---

## Fonctionnalités

### Jeu & moteur

| Module | Capacités |
|--------|-----------|
| **Multijoueur** | WebSocket bidirectionnel, chrono serveur Fischer, nulle, revanche |
| **Matchmaking** | File par mode + ELO, appariement Celery toutes les 5 s |
| **Vs moteur** | 10 niveaux Stockfish, ELO adaptatif, commentaires coach FR |
| **Analyse** | Post-partie : meilleurs coups, gaffes, évaluation |
| **Reprise** | Persistance `localStorage` + API partie active |
| **Promotion** | Dialogue dame / tour / fou / cavalier |
| **Annulation IA** | 1 ou 2 coups selon réponse moteur |
| **Spectateur** | `/live` + `/watch/[id]` lecture seule |

### Puzzles & apprentissage

| Module | Capacités |
|--------|-----------|
| **Daily** | Puzzle quotidien, streak, partage |
| **Training** | Lots de 10 par difficulté / thème, bilan de session |
| **Rush** | Enchaînement chronométré, score + misses |
| **Survival / Battle** | Modes compétitifs avancés |
| **Catalogue** | 10 000+ puzzles (seed Lichess CC0 + catalogue local) |
| **Curriculum** | 40 leçons long format (~20 pages/doc) |
| **Coach IA** | Conseils dashboard + analyse PGN |
| **Progression** | XP, badges, ELO puzzle |

### Social & compétition

| Module | Capacités |
|--------|-----------|
| **Amis** | Demandes, acceptation, défis directs |
| **Messages** | Chat privé 1-to-1 sur `/friends` |
| **Chat partie** | REST + WebSocket en jeu humain |
| **Clubs** | Liste publique filtrée par pays |
| **Tournois** | Arène / suisse, standings, « Ma partie » |
| **Notifications** | Cloche REST + push WebSocket instantané |
| **Classements** | Mondial + filtre africain par pays |

### Plateforme

| Module | Capacités |
|--------|-----------|
| **Auth** | JWT · inscription · OAuth Google / GitHub → `/auth/callback` |
| **i18n** | EN · FR · AR · PT · SW |
| **Thèmes** | Plateaux classiques + jardins fleuris · pièces stylisées |
| **PWA** | `manifest.json` · mode faible bande passante |
| **Anti-triche** | Limite coups/min · intervalle minimum · moteur C++ |
| **Rate limit** | DRF throttling anon / user |
| **CI** | GitHub Actions : tests · lint · E2E Playwright |

### Matrice fonctionnelle

```mermaid
quadrantChart
    title Priorité produit
    x-axis Accessibilité --> Compétitif
    y-axis Solo --> Social
    quadrant-1 Tournois
    quadrant-2 Matchmaking live
    quadrant-3 Puzzles & Learning
    quadrant-4 Amis & Clubs
    Puzzles: [0.25, 0.3]
    Learning: [0.2, 0.25]
    Live play: [0.75, 0.55]
    Tournaments: [0.85, 0.7]
    Social: [0.6, 0.85]
    AI coach: [0.35, 0.15]
```

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=67E8F9" />

---

## Flux temps réel

### Cycle d'une partie multijoueur

```mermaid
sequenceDiagram
    autonumber
    participant A as Joueur A
    participant MM as Matchmaking WS
    participant C as Celery Beat
    participant G as Game WS
    participant S as GameService
    participant B as Joueur B

    A->>MM: join_queue(mode, elo)
    C->>C: scan queues (5s)
    C-->>G: create_game(A, B)
    G->>A: game_state
    G->>B: game_state
    A->>G: jouer_coup(uci, spent_ms)
    G->>S: validate + clock serveur
    S-->>G: FEN + statut
    G->>A: game_state
    G->>B: game_state
```

### Flux puzzle (entraînement)

```mermaid
flowchart TD
    A[GET /api/puzzles/training/] --> B[Lot de 10 puzzles]
    B --> C[PuzzleBoard — validation locale]
    C --> D{Coup correct?}
    D -->|Non| E[Indice après 1 erreur]
    D -->|Oui| F[Auto-reply adversaire]
    F --> G{Ligne terminée?}
    G -->|Non| C
    G -->|Oui| H[POST /api/puzzles/id/submit/]
    H --> I[Célébration + ELO + XP]
    I --> J{Fin du lot?}
    J -->|Non| B
    J -->|Oui| K[Bilan de session]
```

### Authentification OAuth

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant P as Provider OAuth
    participant B as Backend

    U->>F: Clic Google / GitHub
    F->>P: Redirect OAuth
    P->>F: /auth/callback?code=...
    F->>B: POST /api/users/auth/oauth/exchange/
    B-->>F: JWT access + refresh
    F->>F: Store Zustand + cookie
```

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=1B7A3D" />

---

## API & WebSocket

### REST — extrait

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/login/` | JWT access + refresh |
| `POST` | `/api/users/register/` | Création de compte |
| `GET` | `/api/games/live/` | Parties humaines en cours |
| `POST` | `/api/games/{id}/move/` | Coup (fallback REST) |
| `POST` | `/api/games/{id}/draw/` | Proposition de nulle |
| `POST` | `/api/games/{id}/rematch/` | Revanche |
| `GET` | `/api/puzzles/daily/` | Puzzle du jour |
| `GET` | `/api/puzzles/training/` | Lot d'entraînement |
| `POST` | `/api/puzzles/{id}/submit/` | Validation + ELO puzzle |
| `GET` | `/api/learning/dashboard/` | Parcours + coach |
| `GET` | `/api/tournaments/` | Liste des tournois |

Référence complète : [docs/API.md](docs/API.md)

### WebSocket

| Canal | URL | Authentification |
|-------|-----|------------------|
| Partie | `ws://host/ws/game/<uuid>/` | `Sec-WebSocket-Protocol: bearer,<JWT>` |
| Matchmaking | `ws://host/ws/matchmaking/` | idem |
| Notifications | `ws://host/ws/notifications/` | idem |

Repli dev (désactivé par défaut) : `?token=JWT` si `WS_ALLOW_QUERY_TOKEN=true`

Abandon : `POST /api/games/<uuid>/resign/`

Protocole détaillé : [docs/WEBSOCKET_MULTIPLAYER.md](docs/WEBSOCKET_MULTIPLAYER.md)

### OAuth production

1. Variables : `GOOGLE_OAUTH_*`, `GITHUB_*`, `FRONTEND_URL`
2. Redirect URI : `https://api.domaine.com/accounts/google/login/callback/`
3. Flux : login → provider → `/auth/callback` → exchange JWT (TOTP si 2FA)

Guide : [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=D4A017" />

---

## Design system

### Palette

<table>
<tr>
<td align="center" width="140">
<img src="https://img.shields.io/badge/GOLD-D4A017?style=flat-square&labelColor=0D1117" /><br/><br/>
<b>Gold</b><br/>
<code>#D4A017</code><br/>
CTA · accents · titres
</td>
<td align="center" width="140">
<img src="https://img.shields.io/badge/GREEN-1B7A3D?style=flat-square&labelColor=0D1117" /><br/><br/>
<b>Green</b><br/>
<code>#1B7A3D</code><br/>
Succès · progression
</td>
<td align="center" width="140">
<img src="https://img.shields.io/badge/CYAN-67E8F9?style=flat-square&labelColor=0D1117" /><br/><br/>
<b>Cyan</b><br/>
<code>#67E8F9</code><br/>
Highlights · data
</td>
<td align="center" width="140">
<img src="https://img.shields.io/badge/NIGHT-0D1117?style=flat-square&labelColor=1B7A3D" /><br/><br/>
<b>Night</b><br/>
<code>#0D1117</code><br/>
Fond · profondeur
</td>
<td align="center" width="140">
<img src="https://img.shields.io/badge/TERRA-C45C26?style=flat-square&labelColor=0D1117" /><br/><br/>
<b>Terracotta</b><br/>
<code>#C45C26</code><br/>
Alertes · erreurs
</td>
</tr>
</table>

### Composants

| Token | Usage |
|-------|-------|
| `font-display` | Titres, hero, célébrations puzzle |
| `glass-card` | Panneaux flottants, modales |
| `african-gradient` | Boutons primaires or → vert |
| `puzzle-garden-*` | Overlay célébration puzzles |
| Pièces Unicode | Set « africain » sur l'échiquier |
| Motifs Kente | Textures de fond, identité visuelle |

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=67E8F9" />

---

## Routes

### Web

| Route | Module |
|-------|--------|
| `/` | Accueil hero · CTA jouer / puzzle |
| `/play` | IA · matchmaking WS · chrono · chat · analyse |
| `/live` | Parties en direct |
| `/watch/[id]` | Mode observateur |
| `/puzzles` | Daily · training · rush · battle · survival |
| `/puzzles/build` | Créateur de puzzles |
| `/learning` | Dashboard · cours · leçons markdown + FEN |
| `/learning/analyze` | Import PGN |
| `/friends` | Amis · défis · messages privés |
| `/clubs` | Clubs par pays |
| `/tournaments` | Inscription · standings |
| `/leaderboard` | Mondial / africain · filtre pays |
| `/community` | Talents africains |
| `/profile` | Avatar · niveau · thèmes |
| `/stats` | Statistiques détaillées |
| `/login` · `/register` | Auth JWT |
| `/auth/callback` | Retour OAuth |

### Cartographie navigation

```mermaid
flowchart TB
    HOME[/] --> PLAY[/play]
    HOME --> PUZZLES[/puzzles]
    HOME --> LEARN[/learning]
    PLAY --> LIVE[/live]
    PLAY --> WATCH[/watch/id]
    PUZZLES --> BUILD[/puzzles/build]
    LEARN --> ANALYZE[/learning/analyze]
    HOME --> SOCIAL[/friends]
    HOME --> TOUR[/tournaments]
    HOME --> RANK[/leaderboard]
```

<img src="https://capsule-render.vercel.app/api?type=divider&height=1&color=1B7A3D" />

---

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/SETUP.md](docs/SETUP.md) | Installation · dépannage · Stockfish |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production · HTTPS/WSS · Celery · OAuth |
| [docs/API.md](docs/API.md) | Référence REST complète |
| [docs/WEBSOCKET_MULTIPLAYER.md](docs/WEBSOCKET_MULTIPLAYER.md) | Protocole WebSocket multijoueur |
| [docs/LEARNING.md](docs/LEARNING.md) | Module pédagogique |
| [docs/CURRICULUM_40_DOCUMENTS.md](docs/CURRICULUM_40_DOCUMENTS.md) | Programme 40 leçons |
| [docs/FEATURES_ROADMAP.md](docs/FEATURES_ROADMAP.md) | Feuille de route détaillée |

---

## Roadmap

### Livré

```mermaid
timeline
    title Milestones
    section Core
        Multijoueur WebSocket : Chrono serveur Fischer
        Matchmaking Celery : Forfait déconnexion
        Tournois : Arène · Suisses · Observateur
    section Train
        Puzzles : Daily · Rush · 10 000+ catalogue
        Learning : 40 documents · UI leçons
    section Platform
        OAuth Google GitHub : Notifications push WS
        CI CD : 280+ tests · E2E Playwright
        Mobile Expo : Play · Puzzles · Daily
```

<details open>
<summary><strong>Détail — fonctionnalités en production</strong></summary>

- Multijoueur WebSocket + chrono serveur
- Matchmaking Celery + forfait déconnexion
- Tournois arène / suisse, observateur
- Puzzles rush · survival · battle · leaderboard
- Curriculum 40 documents + UI leçons
- Notifications push WebSocket
- OAuth Google / GitHub + callback JWT
- CI + tests étendus + E2E Playwright
- Messages privés UI
- App mobile Expo

</details>

<details>
<summary><strong>En cours / à venir</strong></summary>

- [ ] Pièces SVG illustrées style africain
- [ ] i18n complet de toutes les pages
- [ ] Intégration rating FIDE
- [x] Push notifications natives (APNs / FCM)
- [ ] Streaming live avancé

</details>

---

## CI / CD

```mermaid
flowchart LR
    PUSH[git push] --> GHA[GitHub Actions]
    GHA --> BT[Backend tests]
    GHA --> LT[Frontend lint]
    GHA --> FT[Frontend vitest]
    GHA --> E2E[Playwright E2E]
    BT --> OK{All green?}
    LT --> OK
    FT --> OK
    E2E --> OK
    OK -->|Yes| MERGE[Merge ready]
    OK -->|No| FIX[Fix required]
```

Fichier : [.github/workflows/ci.yml](.github/workflows/ci.yml)

---

## Crédits & licence

<table>
<tr>
<td>

**AFRICHESS** — © 2026  
Conçu et développé par **Maxime Dzidula KELI**

Projet **propriétaire**. Tous droits réservés.

</td>
<td align="center">

[![Contact](https://img.shields.io/badge/WhatsApp-Contact-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/33754830039)

</td>
</tr>
</table>

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:D4A017,50:1B7A3D,100:0D1117&height=110&section=footer&text=Elevating+chess+on+the+global+stage&fontSize=17&fontColor=ffffff&animation=scaleIn" alt="footer" />

<br />

<sub>Jouez · Apprenez · Progressez — AFRICHESS</sub>

</div>
