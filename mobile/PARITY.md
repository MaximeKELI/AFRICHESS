# Parité web ↔ mobile Flutter

Checklist des surfaces web (`frontend/src/app`) et équivalent Flutter (`mobile/lib`).

Légende :
- **OK** = écran + navigation + API branchés
- **PARTIEL** = flux utilisable mais UI plus simple que le web
- **TODO** = non couvert

| Domaine web | Route Flutter | Statut |
|-------------|---------------|--------|
| Accueil | `/` | OK |
| Login / Register / OAuth / 2FA | `/login` `/register` `/auth/callback` | OK |
| Play / matchmaking / IA | `/play` `/game/:id` | PARTIEL (horloges/Crazyhouse à peaufiner) |
| Bots | `/bots` | OK |
| Watch / Review / games review | `/watch/:id` `/review/:id` `/games/:id/review` | OK |
| Lobby / daily / vote | `/lobby` `/daily` `/play/daily` `/play/vote` | OK / PARTIEL |
| Puzzles (tous modes) | `/puzzles/*` + storm/racer | OK |
| Friends / DM / challenges | `/friends` `/messages` `/messages/:u` | OK |
| Clubs / teams | `/clubs` `/teams` | OK |
| Leaderboard / leagues | `/leaderboard` `/leagues` | OK |
| Tournaments / arena / swiss | `/tournaments` `/arena` `/swiss` | OK |
| Learning / learn / courses | `/learning` `/learn` `/learning/*` | OK / PARTIEL |
| Studies / practice / SRS | `/studies` `/practice` `/learning/study` | PARTIEL |
| Analysis / editor / paste / opening / clock / tools | `/analysis` `/editor` `/paste` `/opening` `/clock` `/tools` | OK / PARTIEL |
| Training solo/vision/endgames | `/training/*` | PARTIEL |
| Stats / insights | `/stats` `/insights` | OK |
| TV / live / simul / broadcasts | `/tv` `/live` `/simul` `/broadcasts` | OK |
| Forum / blog / community / events | `/forum` `/blog` `/community` `/events` | OK |
| Coaches / streamers / players | `/coaches` `/streamers` `/players` | OK |
| Classroom | `/classroom` | PARTIEL |
| Premium / settings / profile | `/premium` `/settings` `/profile` `/profile/:u` | OK |
| Notifications | `/notifications` | PARTIEL (WS live à brancher) |
| Legal | `/legal/privacy` | OK |
| Admin / fairplay | `/admin` `/admin/*` | OK |
| Push FCM | devices API | PARTIEL |

## Tester sur téléphone Android virtuel

AVD déjà présents : `Medium_Phone`, `Pixel_10_Pro_XL`, …

```bash
# 1) Backend local
make up   # ou hybrid

# 2) Émulateur + app (script)
make mobile-emulator

# ou à la main :
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH
$ANDROID_HOME/emulator/emulator -avd Medium_Phone &
adb wait-for-device
cd mobile
flutter run -d android \
  --dart-define=API_URL=http://10.0.2.2:8000/api \
  --dart-define=WS_URL=ws://10.0.2.2:8000
```

`10.0.2.2` = localhost de ta machine vu depuis l’émulateur.

## WebSockets

| Canal | Mobile |
|-------|--------|
| `/ws/game/{id}/` | `GameScreen` |
| `/ws/matchmaking/` | `PlayHubScreen` |
| `/ws/notifications/` | prêt (`ws.dart`) — brancher inbox |
| `/ws/simul/{id}/` | prêt |
| `/ws/chat/...` | prêt |

## Honnêteté produit

La **couverture des routes** vise la parité web. Plusieurs écrans restent **PARTIEL** (listes API + plateau) par rapport au polish web. Le travail suivant = approfondir play (horloges, flag, rematch, Crazyhouse), notifications live, classroom collaboratif, et UI études.
