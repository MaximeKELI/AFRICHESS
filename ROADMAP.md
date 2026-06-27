# AFRICHESS — Roadmap priorisée

> Objectif : parité Chess.com progressive + différenciation africaine  
> Horizon : 12 mois · Mise à jour Juin 2026

---

## Phase 0 — Stabilisation (Semaine 1–2) ✅ en cours

- [x] Audit complet 65 features
- [x] Export PGN, Zen mode, glossaire, forum create, achievements page
- [x] Inscription : messages FR, throttle dev
- [ ] Redémarrer backend (`./scripts/unblock-registration.sh`)
- [ ] Tests E2E inscription + play

---

## Phase 1 — Niveau 1 complet (Mois 1)

| Priorité | Feature | Effort | Fichiers clés |
|----------|---------|--------|---------------|
| P0 | Emotes en chat (8 emotes échecs) | 2j | `GameChat.tsx`, `ChatConsumer` |
| P0 | Flair / badge pseudo | 2j | `User` model, `UserAvatar` |
| P1 | Toggle sons séparé | 1j | `preferences.ts`, `ChessBoard` |
| P1 | Blog simple (markdown) | 3j | `BlogPost` model, `/blog` |
| P1 | Widgets PWA (streak, daily puzzle) | 3j | `sw.js`, manifest |
| P2 | Profil : édition bio/pays | 1j | `profile/page.tsx` |

---

## Phase 2 — Niveau 2 cœur compétitif (Mois 2–4)

| Priorité | Feature | Effort |
|----------|---------|--------|
| P0 | Glicko-2 remplace Elo | 1 sem | → voir EXTERNAL_HELP (lib gratuite) |
| P0 | Puzzle Elo joueur | 3j | `ratings/services.py`, puzzle submit |
| P0 | Daily chess : pool ouvert + vacances | 2 sem | `correspondence.py`, Celery tasks |
| P0 | Swiss/Arena multi-rondes | 2 sem | `tournaments/services.py`, Celery |
| P1 | Puzzle Battles (WS) | 2 sem | Nouveau consumer |
| P1 | Classical matchmaking | 2j | `serializers.py` |
| P1 | Self-analysis board (setup FEN) | 1 sem | `/analyze/board` |
| P2 | Vision trainer | 1 sem | Nouvelle page + drills |
| P2 | Variantes humain vs humain | 1 sem | matchmaking + WS |

---

## Phase 3 — Niveau 3 contenu & IA (Mois 5–8)

| Priorité | Feature | Dépendance externe |
|----------|---------|-------------------|
| P0 | Game Review NL (LLM) | OpenAI API ~200€/mois |
| P0 | Cloud analysis profondeur 30+ | VPS ~500€/mois |
| P1 | Opening repertoires | Contenu + dev |
| P1 | 50+ vidéos pédagogiques | Partenariats coachs africains |
| P2 | Classroom WebRTC | Daily.co / LiveKit |
| P2 | Voice coach complet | Web Speech + LLM |

---

## Phase 4 — Niveau 4 production (Mois 9–12)

| Feature | Action |
|---------|--------|
| Fair Play ML | Partenariat ou modèle custom — **CRITIQUE** |
| Mobile app RN/Flutter | Finaliser `mobile/` |
| CinetPay + MTN MoMo | **A4 différenciateur** |
| API publique | OpenAPI + clés |
| Proctor browser | Stub seulement sauf tournois prize |
| Tournois prizes légaux | Conseil juridique |

---

## Différenciation AFRICHESS (priorité produit)

```
Mois 1–2  : A6 basse conso (✅) + A1 i18n (✅) + A7 bots (✅)
Mois 3–4  : A2 classements régionaux enrichis + A8 clubs pays
Mois 5–6  : A4 CinetPay / Orange Money / Wave
Mois 7+   : A3 partenariat FIDE Africa
```

---

## Métriques de succès

| Métrique | Actuel (est.) | Cible 6 mois |
|----------|---------------|--------------|
| Features N1 complètes | 9/15 | 15/15 |
| Features N2 complètes | 4/22 | 14/22 |
| Score audit | 26% ✅ | 45% ✅ |
| Users simultanés | ~150 local | 5 000 prod |
| Latence API Afrique | Non mesuré | <200ms (CDN) |

---

## Stack actuelle (confirmée)

```
Frontend  : Next.js 14 + TypeScript + Tailwind
Backend   : Django 5 + DRF + Channels + Celery
DB        : PostgreSQL + Redis
IA        : Stockfish (serveur) + chess.js (client)
Paiement  : Stripe (→ CinetPay Phase 4)
Deploy    : Docker Compose local → Cloudflare + af-south-1
```
