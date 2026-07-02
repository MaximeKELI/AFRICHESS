# Parité Lichess — approche légale et plan d’implémentation

## Peut-on « copier » Lichess ?

| Source Lichess | Licence | Usage AFRICHESS |
|----------------|---------|-----------------|
| Code `lila` / `lila-ws` | **AGPL-3.0** | ❌ Pas de copier-coller dans un dépôt **propriétaire** sans ouvrir tout le projet sous AGPL |
| Base puzzles Lichess | **CC0** | ✅ Déjà importée (`lichess_import.py`) |
| API Opening Explorer | **Publique** | ✅ Proxy autorisé (`explorer.lichess.ovh`) |
| API Tablebases Syzygy | **Publique** | ✅ Déjà utilisée (`tablebase.py`) |
| Algorithme **Glicko-2** | Littérature académique | ✅ Réimplémentation mathématique (pas du code Scala) |
| UX / comportement produit | — | ✅ Réimplémentation inspirée (Studies, Storm, pools) |

**Conclusion** : on vise la **parité fonctionnelle** par réécriture Django/Next.js, pas le fork de `lila`.

---

## État des lieux (juin 2026)

| Fonctionnalité Lichess | AFRICHESS avant Phase 1 | Phase 1 (cette livraison) |
|------------------------|-------------------------|---------------------------|
| Matchmaking rapide | Celery 60 s | **5 s** |
| Variante Atomic | Backend OK, UI absente | **UI activée** |
| Opening explorer (millions de parties) | Arbre local ~50 lignes | **API Lichess proxy** |
| Glicko-2 | Elo seul | **Glicko-2 + RD** (option `USE_GLICKO2`) |
| Studies collaboratives | Absent | **v1** (chapitres PGN, partage) |
| Puzzle Storm (3 min, flux infini) | Rush 20 puzzles fixe | **Storm** (puzzles dynamiques) |
| Puzzle Racer | Battle 1v1 | Déjà **Battle** — renommage UX à faire |
| Broadcasts / TV | Absent | Phase 3 |
| Antichess / Horde / Racing Kings | Absent | Phase 4 |
| Liquidité joueurs | N/A code | Croissance communauté |

---

## Phases restantes (estimation)

### Phase 2 — livré

| Fonctionnalité | Détail |
|----------------|--------|
| **Pools matchmaking** | Retry Celery **2 s**, élargissement ELO +50 / 3 s (max 500) |
| **Notifications WS** | Centralisées dans `_create_match` |
| **Glicko ± RD** | `rating_display` API + profil / leaderboard |
| **Status pools** | `/api/games/matchmaking/status/` → `pools` |

### Phase 3 — livré

| Fonctionnalité | Détail |
|----------------|--------|
| **Broadcast relay** | Modèles `Broadcast` / `BroadcastBoard`, API `/api/games/broadcasts/`, sync tournoi |
| **Lichess TV** | `/api/games/live/tv/` — rotation 30 s par canal (best, bullet, blitz, rapid, classical) |
| **Team Battle** | Format `team_battle`, scores agrégés par club, `/team-scores/` |
| **Studies I/O** | Import/export PGN multi-chapitres (format Lichess) |
| **Explorer cache** | Déjà actif (`LICHESS_EXPLORER_CACHE_SECONDS`) |

### Phase 4 — à venir
- Antichess, Horde, Racing Kings
- Mobile : matchmaking WS, Studies, review
- Blind mode / clavier (accessibilité)

### Phase 5 — Scale (continu)
- Infra documentée (`docs/ARCHITECTURE_SCALE.md`, K8s, alertes)
- Fair play auto à échelle (shadow pools AIE)

**Parité ~100 % Lichess** = **12–18 mois** équipe 2–3 devs + liquidité joueurs.  
**Parité joueur casual (~80 %)** réaliste en **3–4 mois** Phases 1–2.

---

## Fichiers Phase 1

| Fichier | Rôle |
|---------|------|
| `backend/apps/ratings/glicko2.py` | Moteur Glicko-2 |
| `backend/apps/games/lichess_explorer.py` | Client API Opening Explorer |
| `backend/apps/learning/shared_studies.py` | Modèles + vues Studies v1 |
| `backend/apps/puzzles/storm.py` | Puzzle Storm (flux infini) |
| `config/settings/base.py` | `USE_GLICKO2`, matchmaking 5 s |
