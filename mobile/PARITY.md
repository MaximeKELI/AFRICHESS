# Parité web ↔ mobile Flutter

Checklist des surfaces web ([`frontend/src/app`](../frontend/src/app)) et équivalent Flutter (`mobile/lib`).

Légende : OK = écran + API branchés · PARTIEL = liste/détail basique · TODO = à enrichir UI

| Domaine web | Route Flutter | Statut |
|-------------|---------------|--------|
| Accueil | `/` | OK |
| Login / Register / OAuth | `/login` `/register` `/auth/callback` | OK |
| Play / matchmaking / IA | `/play` `/game/:id` | OK |
| Bots | `/bots` | OK |
| Watch / Review | `/watch/:id` `/review/:id` | OK |
| Lobby | `/lobby` | OK |
| Daily / correspondence | `/daily` | OK |
| Puzzles hub + modes | `/puzzles/*` | OK |
| Friends / DM / challenges | `/friends` `/messages/:u` | OK |
| Clubs | `/clubs` `/clubs/:slug` | OK |
| Leaderboard / leagues | `/leaderboard` `/leagues` | OK |
| Tournaments | `/tournaments` | OK |
| Learning / courses / videos | `/learning/*` | OK |
| Studies / practice | `/studies` `/practice` | OK |
| Analysis / editor / coords | `/analysis` `/editor` `/learning/coordinates` | PARTIEL |
| Stats | `/stats` | OK |
| TV / simul / broadcasts | `/tv` `/simul` `/broadcasts` | OK |
| Forum / blog / events | `/forum` `/blog` `/events` | OK |
| Coaches / streamers / teams | `/coaches` `/streamers` `/teams` | OK |
| Premium / settings / profile | `/premium` `/settings` `/profile` | OK |
| Notifications | `/notifications` | OK |
| Admin / fairplay | `/admin` `/admin/fairplay` | OK |
| Classroom / vote / arena UI fine | — | PARTIEL (API tournois/games) |
| Push FCM wiring | devices API ready | PARTIEL |

## WebSockets

| Canal | Utilisation mobile |
|-------|--------------------|
| `/ws/game/{id}/` | `GameScreen` |
| `/ws/matchmaking/` | `PlayHubScreen` |
| `/ws/notifications/` | prêt (`ws.dart`) — brancher inbox live |
| `/ws/simul/{id}/` | prêt |
| `/ws/chat/...` | prêt |

## Référence legacy Expo

[`mobile_expo_legacy/`](../mobile_expo_legacy/) — logique play/puzzles/auth à réutiliser pour peaufiner.
