# Feuille de route fonctionnalités (20 points)

## ✅ Implémenté

| # | Fonctionnalité | Détail |
|---|----------------|--------|
| 1 | **Chronomètres** | Affichage, décompte client, `spent_ms` serveur, incrément Fischer |
| 2 | **Reprise de partie** | `localStorage` + bannière Reprendre + `GET /api/games/active/` |
| 3 | **Analyse post-partie** | Bouton Stockfish, gaffes, liste des coups |
| 4 | **Promotion** | Dialogue dame/tour/fou/cavalier |
| 5 | **Annuler** | `POST /api/games/{id}/undo/` (1 ou 2 coups vs IA) |
| 6 | **Ouvertures** | Nom affiché dans le panneau (heuristique) |
| 13 | **Coach enrichi** | Commentaire avec perte en pions (eval) |
| 17 | **PWA** | `manifest.json` + métadonnées |
| 19 | **Culture** | Section histoires sur `/community` |

## ✅ Ajouts récents (complément roadmap)

| # | Fonctionnalité | Détail |
|---|----------------|--------|
| 7 | Puzzles+ | Leaderboard, mode rush, streak |
| 8 | Tournois | Moteur arène/suisse, standings, start, my-game |
| 9 | Classement pays | Filtre pays |
| 10 | Amis & défis | Page + API + notif |
| 11 | Chat | REST + WS partie ; messages privés API |
| 12 | Notifications | Cloche + WS `ws/notifications/` |
| 14 | Entraînement | Puzzles training + curriculum 40 docs |
| 15 | ELO adaptatif | Preview IA |
| 16 | CI | GitHub Actions backend + lint frontend |
| 18 | i18n | EN/FR/AR/PT/SW (menu étendu) |
| 20 | Pièces | Thème pièces « africain » (préférences) |
| — | Multijoueur | Chrono serveur, matchmaking Celery, spectateur, nulle, revanche |
| — | Ops | Rate limit, anti-triche, doc déploiement |

## 🔶 Encore perfectible

| # | Sujet |
|---|--------|
| 16 | Tests E2E Playwright complets (scénario login→partie) |
| 20 | Pièces SVG illustrées (vs Unicode) |
| — | OAuth Google/GitHub bout-en-bout |
| — | Push notifications mobile natives |

## Tests

```bash
docker compose exec backend python manage.py test apps.games.tests
```
