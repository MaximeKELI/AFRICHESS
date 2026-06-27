# AFRICHESS — Rapport d'audit vs Chess.com

> Audit du code source (backend Django + frontend Next.js) — Juin 2026  
> Légende : ✅ Implémenté · 🔄 Partiel · ❌ Manquant

---

## Niveau 1 — Facile (UI / logique de base)

| # | Fonctionnalité | Statut | Notes |
|---|----------------|--------|-------|
| 1 | Thèmes de plateau | ✅ | 20 thèmes, pièces classic/african, sons, dark mode — `boardThemes.ts`, `BoardThemePicker` |
| 2 | Flair / Avatar | ✅ | Avatar upload + presets ; flair emoji à côté du pseudo — `FlairPicker`, `UserFlair` |
| 3 | Emotes | ✅ | `EmotePicker` dans `GameChat` — 12 emotes échecs |
| 4 | Termes / Glossaire | ✅ | `/learning/glossary` (20 termes FR) |
| 5 | Profil utilisateur | ✅ | `/profile`, `/profile/[username]`, stats, Elo par cadence via API ratings |
| 6 | Achievements / Awards | 🔄 | Badges learning (XP) ; page `/achievements` ; pas de trophées jeu |
| 7 | Messages privés | ✅ | REST + WS direct chat |
| 8 | Chat en partie | ✅ | `GameChat`, WS `ChessConsumer` |
| 9 | Forums | 🔄 | Lecture, commentaires, likes ; création de sujet ajoutée (`ForumCreateForm`) |
| 10 | Blogs | ✅ | `/blog`, `/blog/new`, diagrammes FEN `[diagram:...]` |
| 11 | Zen Mode | ✅ | Toggle Navbar, masque Elo/export en partie |
| 12 | Widgets app | 🔄 | PWA install prompt ; pas de widgets natifs iOS/Android |
| 13 | Notation PGN | ✅ | Stockage backend ; export client `PgnExportButton` |
| 14 | Historique parties | ✅ | `RecentGamesList`, stats, filtres partiels |
| 15 | Statistiques personnelles | ✅ | `/stats` — accuracy, ouvertures, cadences |

---

## Niveau 2 — Intermédiaire

| # | Fonctionnalité | Statut | Notes |
|---|----------------|--------|-------|
| 16 | Jeu classé multi-cadences | ✅ | Bullet/blitz/rapid/classical + horloges `MODE_TIME_CONFIG` |
| 17 | Jeu non classé | ✅ | Toggle classée/amicale, champ `is_rated`, matchmaking filtré |
| 18 | Daily Chess | ✅ | Pool + vacances + forfeit Celery (`forfeit_overdue_correspondence_games`) |
| 19 | Puzzles quotidiens | ✅ | Daily + streak |
| 20 | Puzzles notés | ✅ | Elo puzzle joueur via `SubmitPuzzleView` + profil |
| 21 | Puzzle Rush | ✅ | Sessions serveur `PuzzleRushStartView` / `rushSubmit`, timer sync |
| 22 | Puzzle Battles | ✅ | File d'attente + combat 1v1 (`PuzzleBattle`) |
| 23 | Custom Puzzles | ✅ | Builder `/puzzles/build`, API `CustomPuzzleCreateView` |
| 24 | Analyse de partie | ✅ | Stockfish, accuracy, classifications |
| 25 | Self Analysis | ✅ | `/learning/analyze/board` — éditeur FEN + Stockfish |
| 26 | Système de Ligues | ✅ | Wood → Legend, saisons |
| 27 | Tournois Swiss | 🔄 | Multi-rondes auto ; pairing simplifié |
| 28 | Tournois Arena | 🔄 | Re-pairing ; pas de WS live dédié |
| 29 | Tournois Daily | ✅ | Format `daily`, `days_per_move`, parties correspondence |
| 30 | Clubs / Équipes | ✅ | CRUD + chat club REST + événements `ClubEvent` |
| 31 | Vote Chess | 🔄 | MVP create/vote/apply ; flow adversaire simplifié |
| 32 | Club vs Club Arena | ✅ | Format `club_arena`, `ClubArenaChallengeView` |
| 33 | Odds Chess | ✅ | Presets FEN, défi ami avec handicap |
| 34 | Simuls | ✅ | `SimulSession`, list/create/join `/simul` |
| 35 | Explorateur d'ouvertures | 🔄 | Lookup API + navigation coups chess.js (pas master DB) |
| 36 | Vision Training | ✅ | `/training/vision` — coordonnées + couleur cases |
| 37 | Solo Chess | ✅ | `/training/solo` — 4 niveaux capture-only |

---

## Niveau 3 — Avancé

| # | Fonctionnalité | Statut | Notes |
|---|----------------|--------|-------|
| 38 | Bots (IA) | ✅ | Catalogue + personnalités africaines, Elo adaptatif |
| 39 | Coach IA | ✅ | `CoachPanel`, plan hebdo, hub `/insights` |
| 40 | Play Coach | 🔄 | Commentaires enrichis eval + best move hint |
| 41 | Voice Coach | ✅ | TTS dans `GameAnalysisPanel` + `aiSpeech.ts` |
| 42 | Game Review IA | ✅ | Synthèse NLG `review_nlg.py`, moments clés |
| 43 | Move Explanations | ✅ | `move_explain.py` — PV + best move en prose |
| 44 | 7-Piece Tablebases | 🔄 | Probe API Lichess `GET /games/engine/tablebase/` |
| 45 | Cloud Analysis | ✅ | Celery async `analyze/async/` + status poll |
| 46 | Leçons interactives | ✅ | 40 leçons markdown, quiz, XP |
| 47 | Vidéothèque | ✅ | Modèle `Video`, `/learning/videos`, seed 5 vidéos |
| 48 | Articles pédagogiques | ✅ | Curriculum markdown |
| 49 | Courses / Chessable | ✅ | `StudyLine` + SM-2, `/learning/study` |
| 50 | Opening Repertoires | ✅ | `OpeningRepertoire`, `/learning/repertoires` |
| 51 | Analytics avancées | ✅ | Hub `/insights` stats + coach |
| 52 | Classroom | 🔄 | `ClassroomSession` REST, pas WebRTC |
| 53 | Streamers intégrés | 🔄 | `StreamerProfile`, API `/social/streamers/` |
| 54 | Coaches marketplace | 🔄 | `CoachProfile`, `/coaches` listing, pas Stripe Connect |

---

## Niveau 4 — Expert (stubs / documentation uniquement)

| # | Fonctionnalité | Statut | Notes |
|---|----------------|--------|-------|
| 55 | Fair Play (détection triche) | 🔄 | Anticheat timing ; pas ML engine detection |
| 56 | Proctor Browser | ❌ | Stub → EXTERNAL_HELP_REPORT |
| 57 | Variantes | 🔄 | 960, Crazyhouse, KOTH, 3-check vs IA ; pas humain |
| 58 | CCC | ❌ | — |
| 59 | Tournois avec prizes | 🔄 | Stripe ; pas infra légale prizes |
| 60 | Glicko-2 multi-cadences | 🔄 | Elo par mode ; pas Glicko-2 |
| 61 | RCN temps réel | 🔄 | Channels/Daphne ; pas infra scale Chess.com |
| 62 | App mobile native | 🔄 | PWA + dossier `mobile/` Flutter partiel |
| 63 | ChessKid | ❌ | — |
| 64 | API publique | 🔄 | Schema protégé ; pas API dev ouverte |
| 65 | Abonnements | ✅ | Free/Gold/Diamond Stripe |

---

## Différenciation AFRICHESS (A1–A8)

| # | Fonctionnalité | Statut |
|---|----------------|--------|
| A1 | Langue française native | ✅ 5 langues (FR/EN/AR/PT/SW) |
| A2 | Classement africain | ✅ `/leaderboard` african + by country |
| A3 | Tournois africains FIDE | ❌ |
| A4 | Mobile money | ❌ Stripe only |
| A5 | Mode offline PWA | 🔄 Service worker basique |
| A6 | Basse consommation | ✅ Mode fluide, low-bandwidth CSS |
| A7 | Bots africains | ✅ Kofi, Amara, Nana Kofi… |
| A8 | Communauté par pays | ✅ Clubs, leaderboard pays |

---

## Score global estimé

| Niveau | ✅ | 🔄 | ❌ |
|--------|----|----|-----|
| 1 (15) | 9 | 4 | 2 |
| 2 (22) | 4 | 12 | 6 |
| 3 (17) | 3 | 11 | 3 |
| 4 (11) | 1 | 6 | 4 |
| **Total (65)** | **17 (26%)** | **33 (51%)** | **15 (23%)** |

**Verdict :** AFRICHESS couvre le **cœur Chess.com** (jouer, puzzles, apprendre, social, stats, premium). Les gaps majeurs : puzzle battles, trainers spécialisés, contenu vidéo massif, fair-play ML, et infra scale.
