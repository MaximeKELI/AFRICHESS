# AFRICHESS — Journal d'implémentation

> Session audit Chess.com — Juin 2026

---

## Audit réalisé

- Analyse complète backend (`backend/apps/*`) — 9 apps Django
- Analyse complète frontend (`frontend/src/*`) — 113 fichiers
- Comparaison 65 fonctionnalités Chess.com + 8 différenciateurs AFRICHESS
- Rapports générés : `AUDIT_REPORT.md`, `EXTERNAL_HELP_REPORT.md`, `ROADMAP.md`

---

## Fonctionnalités implémentées — Niveau 2 (session courante)

| Feature | Fichiers | Description |
|---------|----------|-------------|
| **Classical + horloges** | `services.py`, `serializers.py` | `MODE_TIME_CONFIG` dans matchmaking, classical autorisé |
| **Parties amicales** | `Game.is_rated`, migration `0013`, `play/page.tsx` | Toggle classée/amicale |
| **Elo puzzle joueur** | `ratings/services.py`, `puzzles/views.py` | Rating mode `puzzle` |
| **Daily pool + vacances** | `correspondence.py`, `users/vacation`, `daily/page.tsx` | Seek + vacation_until |
| **Swiss multi-rondes** | `tournaments/services.py`, migration `0005` | Avancement auto |
| **Arena re-pairing** | `tournaments/services.py` | Pairing joueurs disponibles |
| **Vision Training** | `/training/vision`, `visionTraining.ts` | Drills coordonnées |
| **Solo Chess** | `/training/solo`, `soloChess.ts` | 4 niveaux |
| **Self-analysis board** | `/learning/analyze/board` | Éditeur + eval Stockfish |

---

## Fonctionnalités implémentées — Niveau 2 (complément)

| Feature | Fichiers | Description |
|---------|----------|-------------|
| **Daily forfeit Celery** | `games/tasks.py`, `settings/base.py` | Forfait auto parties correspondence en retard |
| **Puzzle Rush sessions** | `puzzles/rush_battle.py`, `PuzzleRushSession`, frontend rush API | Timer serveur, score/misses persistés |
| **Puzzle Battles** | `PuzzleBattle`, `PuzzleBattleQueue`, onglet Combat | File + combat 1v1 |
| **Custom puzzles** | `CustomPuzzleCreateView`, `/puzzles/build` | Builder FEN + solution |
| **Tournois Daily** | `Tournament.Format.DAILY`, migration `0006` | Parties correspondence en tournoi |
| **Club chat & events** | `ClubChat`, `ClubEvent`, page club | Chat REST + calendrier événements |
| **Club vs Club Arena** | `club_arena` format, `ClubArenaChallengeView` | Défi inter-clubs |
| **Vote Chess MVP** | `VoteGame`, `GameVote`, `/play/vote` | Création + votes par coup |
| **Odds Chess** | `games/odds.py`, défi ami | Handicaps matériels (cavalier→dame) |
| **Simultanées** | `SimulSession`, `/simul` | Hôte + rejoindre |
| **Openings explorer fix** | `learning/openings/page.tsx` | FEN avance au clic sur un coup |

### Migrations Level 2

- `games/0014_level2_extended.py` — vote, simul, odds fields
- `puzzles/0004_level2_features.py` — rush, battle, custom puzzle fields
- `social/0005_clubevent.py`
- `tournaments/0006_level2_daily_club.py`

---

## Fonctionnalités implémentées — Niveau 3

| Feature | Fichiers | Description |
|---------|----------|-------------|
| **Coach + plan** | `learning/coach.py`, `/insights` | Conseils + plan hebdo |
| **Game Review NLG** | `learning/review_nlg.py`, `GameAnalysis.summary_fr` | Synthèse + moments clés |
| **Move explanations** | `learning/move_explain.py` | PV + best move en prose |
| **Voice coach** | `GameAnalysisPanel`, `aiSpeech.ts` | TTS revue de partie |
| **Cloud analysis** | `AnalysisJob`, `tasks.analyze_game_async` | Analyse async profonde |
| **Tablebases** | `games/tablebase.py` | Probe Lichess ≤7 pièces |
| **Vidéothèque** | `Video` model, `/learning/videos` | 5 vidéos seed |
| **Répertoires** | `OpeningRepertoire`, `/learning/repertoires` | CRUD lignes SAN |
| **Chessable study** | `StudyLine`, `LineReview`, SM-2 | `/learning/study` |
| **Classroom** | `ClassroomSession`, `/classroom` | Plateau partagé REST |
| **Streamers** | `StreamerProfile`, API | Listing embed |
| **Coaches** | `CoachProfile`, `/coaches` | Marketplace listing |

---

## Fonctionnalités implémentées cette session (Niveau 1)

| Feature | Fichiers | Description |
|---------|----------|-------------|
| **Export PGN** | `frontend/src/lib/pgnExport.ts`, `PgnExportButton.tsx`, `pgnExport.test.ts` | Téléchargement .pgn depuis partie terminée |
| **Mode Zen** | `store/preferences.ts`, `Navbar.tsx`, `globals.css`, `play/page.tsx` | Masque Elo et distractions ; toggle feuille |
| **Glossaire** | `app/learning/glossary/page.tsx` | 20 termes FR avec recherche |
| **Création forum** | `ForumCreateForm.tsx`, `api.ts`, `community/page.tsx` | POST `/api/social/forum/` |
| **Page achievements** | `app/achievements/page.tsx` | Badges learning via `/learning/badges/mine/` |
| **Emotes en partie** | `chessEmotes.ts`, `EmotePicker.tsx`, `GameChat.tsx`, test | 12 emotes thématiques échecs |
| **Flair utilisateur** | `User.flair`, migration `0008`, `FlairPicker`, `UserFlair`, test | Badge emoji à côté du pseudo |
| **Blog échecs** | `/blog`, `/blog/new`, `BlogEditor`, `BlogBody`, test | Articles avec diagrammes FEN |
| **Liens Navbar** | `Navbar.tsx` | Blog, glossaire, récompenses |

### Corrections inscription (session précédente, documentées)

| Fix | Fichiers |
|-----|----------|
| Messages mot de passe FR | `backend/apps/users/serializers.py` |
| Erreurs email/username explicites | `serializers.py`, `errors.ts` |
| Throttle dev assoupli | `development.py`, `views.py`, `auth_views.py` |
| Message throttle FR | `exceptions.py`, `errors.ts` |

---

## Tests ajoutés

- `frontend/src/lib/chessEmotes.test.ts` — emotes (2 cas)
- `frontend/src/lib/flair.test.ts` — validation flair (2 cas)
- `frontend/src/lib/blogBody.test.ts` — parse diagrammes (2 cas)

---

## Non implémenté (Niveau 2 restant — voir ROADMAP)

- Puzzle Battles (#22), Custom puzzle builder (#23), Daily tournois (#29)
- Vote chess, odds, simuls, club vs club (#31-34)
- Forfeit Celery daily chess, Glicko-2 (#60)
- Niveau 3 complet (LLM coach, vidéothèque massive)
- Niveau 4 (fair-play ML, proctor, Glicko-2, mobile money)

---

## Prochaines étapes recommandées

1. `./scripts/unblock-registration.sh` si throttle actif
2. Sprint 1 ROADMAP : emotes, flair, sound toggle, Glicko-2
3. Partenariat CinetPay pour A4 (mobile money)
