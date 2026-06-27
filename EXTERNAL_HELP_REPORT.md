# AFRICHESS — Rapport d'aide extérieure nécessaire

| # | Fonctionnalité | Raison blocage | Solution recommandée | Coût estimé | Complexité | Urgence |
|---|---|---|---|---|---|---|
| 38 | Bots IA (niveaux élevés) | Stockfish local limité en profondeur | Stockfish WASM client + VPS Stockfish serveur | Gratuit → ~50 €/mois | Moyenne | HAUTE |
| 39 | Coach IA | LLM + moteur combinés | OpenAI / Claude API + Stockfish | ~200 €/mois | Haute | HAUTE |
| 40 | Play Coach temps réel | Feedback coup-par-coup LLM | API LLM streaming + eval moteur | ~200 €/mois | Haute | HAUTE |
| 41 | Voice Coach | Synthèse + reconnaissance vocale | Web Speech API + ElevenLabs (optionnel) | Gratuit → ~30 €/mois | Moyenne | MOYENNE |
| 42-43 | Game Review / Move Explanations NL | Génération langage naturel | LLM fine-tuné échecs ou Chess.com-like pipeline | ~300 €/mois | Très haute | HAUTE |
| 44 | Tablebases 7 pièces | Données ~1 To+ | Syzygy en cloud (Lichess API) ou stockage S3 | ~100 €/mois | Faible | BASSE |
| 45 | Cloud Analysis haute profondeur | CPU serveur dédié | VPS 8+ vCPU + Stockfish multi-thread | ~500 €/mois | Haute | HAUTE |
| 46-49 | Vidéothèque / cours GM | Droits auteur + production | Partenariats coachs africains (IM/GM) | Variable | Très haute | MOYENNE |
| 50 | Opening Repertoires | Spaced repetition + contenu | Chessable-like ou Lichess study import | Dev time | Haute | MOYENNE |
| 52 | Classroom audio/vidéo | WebRTC + TURN servers | Daily.co / LiveKit / Jitsi | ~50–200 €/mois | Haute | MOYENNE |
| 53 | Streamers intégrés | API Twitch/YouTube | OAuth Twitch + embed API | Gratuit | Faible | BASSE |
| 54 | Coaches marketplace | Paiement + réservation + KYC | Stripe Connect + Calendly API | % transactions | Haute | MOYENNE |
| 55 | Fair Play (détection triche IA) | ML comportemental + engine correlation | Modèle custom (Lichess anti-cheat insp.) ou Chess.com partnership | ~1000 €+ | Très haute | CRITIQUE |
| 56 | Proctor Browser | App Electron + surveillance caméra/écran | Développement natif dédié | ~5000 €+ | Très haute | BASSE |
| 57 | Variantes complètes (Atomic, Fog…) | Règles non supportées chess.js | Extension chess.js ou python-chess serveur | Gratuit (dev) | Haute | MOYENNE |
| 58 | CCC (Computer Chess Championship) | Infra moteurs 24/7 | Serveur dédié + Lc0/Stockfish cluster | ~200 €/mois | Haute | BASSE |
| 59 | Prizes tournois ($) | Légal gambling/prizes par pays | Avocat + Stripe/CinetPay escrow | Variable | Très haute | HAUTE |
| 60 | Glicko-2 | Algo plus précis qu'Elo | `glicko2` npm / py package | Gratuit | Faible | CRITIQUE |
| 61 | RCN temps réel scale | Latence Afrique + millions users | Redis cluster + Daphne workers + Cloudflare | 100 → 5000 €/mois | Très haute | CRITIQUE |
| 62 | App mobile iOS/Android | Dev natif ou cross-platform | React Native (dossier `mobile/` existant) ou Flutter | Dev time 3–6 mois | Très haute | HAUTE |
| 63 | ChessKid (enfants) | COPPA / RGPD mineurs | Conseil juridique + modération humaine | $$$ | Très haute | BASSE |
| 64 | API publique développeurs | Documentation + rate limits + clés API | OpenAPI public + portal clés | Dev time | Moyenne | MOYENNE |
| 65 | Abonnements Afrique | Stripe seul ; exclusion mobile money | **CinetPay** + **MTN MoMo** + **Orange Money** + Wave | % transactions | Haute | HAUTE |
| A3 | Tournois FIDE Afrique | Partenariat fédérations | Contact FIDE Africa / fédés nationales | Partenariat | Haute | MOYENNE |
| A4 | Mobile Money | Passerelles régionales | CinetPay (XOF/XAF), Flutterwave (NGN), M-Pesa | % transactions | Haute | HAUTE |

---

## Infrastructure recommandée (Afrique)

| Composant | Recommandation | Pourquoi |
|-----------|----------------|----------|
| CDN | **Cloudflare** (free tier → Pro) | Latence réduite continent africain |
| Hébergement API | **Railway / Render** → **AWS af-south-1** (Le Cap) | Proximité géographique |
| Paiements | **Stripe** (international) + **CinetPay** (UEMOA/CEMAC) | Couverture Chess.com + réalité locale |
| Moteur IA | **Stockfish** Docker (gratuit) | Déjà intégré |
| Temps réel | **Redis** + **Daphne** (actuel) → scale horizontal | Suffisant jusqu'à ~10k concurrent |
| Stockage média | **Cloudflare R2** ou **Cloudinary** | Avatars, PGN, futures vidéos |

---

## Contacts / ressources utiles

- **CinetPay** : https://cinetpay.com — Mobile Money Afrique francophone
- **Syzygy tablebases** : https://syzygy-tables.info — API Lichess
- **Glicko-2** : https://github.com/sublee/glicko2 (Python)
- **Stockfish** : https://stockfishchess.org — Licence GPL (OK serveur)
