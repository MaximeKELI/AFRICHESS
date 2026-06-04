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

## 🔶 Partiel / à étendre

| # | Fonctionnalité | État |
|---|----------------|------|
| 7 | Puzzles+ | Daily + entraînement + série localStorage |
| 8 | Tournois | Page `/tournaments` + inscription + `seed_tournaments` |
| 9 | Classement pays | Filtre pays sur classement africain |
| 10 | Amis & défis | Page `/friends` + `POST /social/friends/challenge/` |
| 11 | Chat | `GameChat` REST sur `/play` (parties humaines) |
| 12 | Notifications | Cloche navbar + lien partie |
| 14 | Mode entraînement | Puzzles training ; ouvertures IA à dédié |
| 15 | ELO adaptatif | `elo_adapt.py` sur preview IA (10 dernières parties) |
| 16 | Tests E2E | Tests Django OK ; Playwright à ajouter |
| 18 | i18n | Fichier `i18n.ts` ; traduire pages Jouer/Profil |
| 20 | Pièces africaines | Thèmes plateau OK ; pièces SVG custom à dessiner |

## Tests

```bash
docker compose exec backend python manage.py test apps.games.tests
```
