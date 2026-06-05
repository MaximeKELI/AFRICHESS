# AFRICHESS Mobile (Expo)

Application native iOS/Android avec **échiquier natif** et parties vs IA.

## Fonctionnalités

- Connexion JWT (stockage sécurisé)
- Échiquier tactile 8×8 (pièces Unicode, thème AFRICHESS)
- Partie vs IA : choix ELO ou bot nommé
- Catalogue bots avec lien direct « Défier »
- Chronomètre blitz (3+2) pendant la partie
- Puzzle tactique du jour
- WebSocket : abandon + sync chrono (coups IA via REST)
- Annuler le dernier coup (vs IA)
- Refresh token automatique

## Démarrage

```bash
cd mobile
npm install
npx expo start
```

Puis `a` (Android) ou `i` (iOS simulateur).

## URL API (`app.json` → `extra.apiUrl`)

| Environnement | URL |
|---------------|-----|
| Android émulateur | `http://10.0.2.2:8000/api` |
| iOS simulateur | `http://localhost:8000/api` |
| Appareil physique | `http://<IP-LAN>:8000/api` |

Le backend doit être accessible (CORS + `ALLOWED_HOSTS`). Pour Android physique, autorisez le trafic HTTP si besoin.

## Structure

```
mobile/
  app/           # écrans (expo-router)
  components/    # ChessBoard natif
  context/       # Auth JWT
  lib/           # API, pièces, storage
```

## Dépannage npm

Si `npm install` échoue avec `Invalid Version`, supprimez le lockfile corrompu :

```bash
rm -rf node_modules package-lock.json && npm install
```

## Prochaines étapes

- Matchmaking humain (WebSocket file d'attente)
- Variantes (960, Crazyhouse)
- Push notifications (FCM)
- Pièces SVG / images africaines
