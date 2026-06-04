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

## ✅ Compléments audit (juin 2026)

| Sujet | Détail |
|--------|--------|
| Push WS notifs | Signal `post_save` → `notify_push` |
| Messages privés | UI `/friends` (liste + envoi) |
| E2E Playwright | `frontend/e2e/login-game.spec.ts` + job CI |
| OAuth | `/accounts/google|github/login/` → `/auth/callback` JWT |
| Tests étendus | notifications, social, tournois, learning + consumers WS |

## 🔶 Encore perfectible

| # | Sujet |
|---|--------|
| 20 | Pièces SVG illustrées (vs Unicode) |
| — | Push notifications mobile natives |
| 18 | i18n complet des pages (hors menu) |

## Tests

```bash
docker compose exec backend python manage.py test apps.games.tests
```
