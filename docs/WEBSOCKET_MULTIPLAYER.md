# Multijoueur temps réel — WebSockets AFRICHESS

## Stack

- **Serveur** : Daphne + Django Channels + Redis (`CHANNEL_LAYERS`)
- **Auth WS** : JWT via en-tête **`Sec-WebSocket-Protocol: bearer,<access_token>`** (recommandé)
- **Repli dev** : `?token=<access_token>` uniquement si `WS_ALLOW_QUERY_TOKEN=true`
- **App** : `apps.games` (pas de duplication `realtime`)

## URLs WebSocket

| Route | Consumer | Rôle |
|-------|----------|------|
| `ws://HOST/ws/game/<uuid>/` | `ChessConsumer` | Partie en direct |
| `ws://HOST/ws/matchmaking/` | `MatchmakingConsumer` | File d'attente |
| `ws://HOST/ws/notifications/` | `NotificationConsumer` | Notifications push |

Variable frontend : `NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000`

## Authentification (frontend)

```typescript
import { wsAuthProtocols, wsGameUrl } from "@/lib/gameWs";

const token = Cookies.get("access_token");
const ws = new WebSocket(wsGameUrl(gameId), wsAuthProtocols(token!));
```

Ne pas mettre le JWT dans l'URL en production (`WS_ALLOW_QUERY_TOKEN=false` par défaut).

## Modèles ajoutés

- **GameRoom** : `room_id`, `white_connected`, `black_connected` (1:1 avec `Game`)
- **Move** : champs `from_square`, `to_square` (dérivés de l'UCI)

`Game` et `Move` existants conservés (`fen`, `white_player`, `black_player`, etc.).

## Événements ChessConsumer

### Client → serveur

```json
{ "event": "rejoindre_partie" }
{ "event": "demarrer_partie" }
{ "event": "jouer_coup", "uci": "e2e4", "spent_ms": 1500 }
{ "event": "abandonner_partie" }
{ "event": "proposer_nulle" }
{ "event": "accepter_nulle" }
{ "event": "demander_reprise" }
{ "event": "chat", "message": "Bonne partie !" }
```

Alias anglais acceptés : `move`, `resign`, `offer_draw`, `accept_draw`, etc.

### Serveur → client

```json
{ "event": "game_state", "data": { "game": { ... } } }
{ "event": "recevoir_coup", "data": { "game": { ... }, "last_move": { ... } } }
{ "event": "fin_partie", "data": { "game_over": true, "game": { ... } } }
{ "event": "proposition_nulle", "data": { "offered_by": 42 } }
{ "event": "proposition_reprise", "data": { "requested_by": 42 } }
{ "event": "error", "data": { "message": "..." } }
```

## Abandon HTTP

En plus du WebSocket, l'abandon est disponible via :

`POST /api/games/<uuid>/resign/` (JWT requis)

## Règles serveur

- Seuls les participants (blanc/noir) peuvent se connecter
- `jouer_coup` : validation via `GameService.make_move` (tour, légalité, chrono)
- Coup diffusé aux deux joueurs via Redis channel `game_<uuid>`
- Reconnexion : `rejoindre_partie` renvoie `game_state` complet (FEN + historique)

## Matchmaking WebSocket

Le client web joint la file via **HTTP** `POST /api/games/matchmaking/` puis écoute `match_found` sur le WS.

```json
{ "event": "rejoindre_file", "mode": "blitz", "time_control": "3+2" }
```

Réponses : `en_attente` ou `match_found` avec `game_id` et `room_id`.

## Frontend

- Hook : `frontend/src/hooks/useGameWebSocket.ts`
- Helpers : `frontend/src/lib/gameWs.ts`
- Page : `/play` utilise WS + HTTP pour parties humaines, REST pour IA

## Exemple JavaScript

```javascript
const token = "VOTRE_ACCESS_JWT";
const gameId = "UUID-PARTIE";
const ws = new WebSocket(`ws://localhost:8000/ws/game/${gameId}/`, ["bearer", token]);

ws.onopen = () => {
  ws.send(JSON.stringify({ event: "rejoindre_partie" }));
};

ws.onmessage = (e) => {
  const { event, data } = JSON.parse(e.data);
  if (event === "recevoir_coup" || event === "game_state") {
    console.log("FEN:", data.game.fen);
  }
  if (event === "fin_partie") {
    console.log("Résultat:", data.game.result);
  }
};
```
