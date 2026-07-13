# AFRICHESS Mobile (Flutter)

Application mobile native **Flutter** (Android + iOS) qui consomme les **mêmes API / WebSockets** que le frontend web Django.

> L’ancien client Expo/React Native est archivé dans [`mobile_expo_legacy/`](../mobile_expo_legacy/) (référence des flux).

## Prérequis

- Flutter 3.22+ (`flutter doctor`)
- Backend Django joignable (`make up` ou hybride)
- Linux desktop **ou** Chrome (pas besoin de téléphone)

## Configuration

Variables `--dart-define` :

| Clé | Défaut | Notes |
|-----|--------|--------|
| `API_URL` | `http://127.0.0.1:8000/api` | Android émulateur → `http://10.0.2.2:8000/api` |
| `WS_URL` | `ws://127.0.0.1:8000` | Android → `ws://10.0.2.2:8000` |
| `MEDIA_ORIGIN` | `http://127.0.0.1:8000` | avatars / médias |
| `WEB_URL` | `http://127.0.0.1:3000` | checkout Stripe / liens |

Exemple device LAN :

```bash
flutter run --dart-define=API_URL=http://192.168.1.20:8000/api \
  --dart-define=WS_URL=ws://192.168.1.20:8000
```

## Lancer

Depuis la racine du projet Flutter (`mobile/`, pas `lib/`) :

```bash
cd ~/AFRICHESS/mobile
flutter run -d linux          # bureau Ubuntu
# ou
flutter run -d chrome         # navigateur
# ou
make mobile
```

Android émulateur :

```bash
flutter run -d android \
  --dart-define=API_URL=http://10.0.2.2:8000/api \
  --dart-define=WS_URL=ws://10.0.2.2:8000
```

## Auth

- Login / register / refresh JWT (`flutter_secure_storage`)
- 2FA (champ TOTP optionnel)
- OAuth Google / GitHub → navigateur → deep link `africhess://auth/callback`

## Parcours couverts (parité web)

Voir [`PARITY.md`](PARITY.md) pour la checklist écran par écran.

**Cœur :** home, play (matchmaking + IA + bots), partie live WS, review, watch, puzzles (daily/training/rush/survival/streak/battle/themes), social (amis, DM, clubs), tournois, learning, stats, TV/simul/broadcasts, forum/blog, premium, admin/fairplay.

## Stack

- `go_router` + bottom nav
- `flutter_riverpod`
- `dio` + refresh JWT
- `web_socket_channel` (`bearer` + token)
- `chess` + plateau custom

## Tests

```bash
cd mobile && flutter test
```
