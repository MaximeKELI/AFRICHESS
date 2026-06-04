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
| 7 | Puzzles+ | Page daily existante ; streak/classement à ajouter |
| 8 | Tournois | API `tournaments` existante ; UI arène à brancher |
| 9 | Classement pays | Leaderboard africain ; filtre drapeau à renforcer |
| 10 | Amis & défis | API social ; page défi à créer |
| 11 | Chat | WebSocket `games/consumers` ; UI chat à intégrer |
| 12 | Notifications | App `notifications` ; push in-app à brancher |
| 14 | Mode entraînement | Choisir ouverture via presets IA (à dédié) |
| 15 | ELO adaptatif | Logique dans `elo_config` ; historique 10 parties à brancher |
| 16 | Tests E2E | Tests Django OK ; Playwright à ajouter |
| 18 | i18n | Fichier `i18n.ts` ; traduire pages Jouer/Profil |
| 20 | Pièces africaines | Thèmes plateau OK ; pièces SVG custom à dessiner |

## Tests

```bash
docker compose exec backend python manage.py test apps.games.tests
```
