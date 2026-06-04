# Multijoueur temps réel — WebSockets AFRICHESS

## Stack

- **Serveur** : Daphne + Django Channels + Redis (`CHANNEL_LAYERS`)
- **Auth WS** : JWT via `?token=<access_token>` (cookie `access_token` côté Next.js)
- **App** : `apps.games` (pas de duplication `realtime`)

## URLs WebSocket

| Route | Consumer | Rôle |
|-------|----------|------|
| `ws://HOST/ws/game/<uuid>/?token=JWT` | `ChessConsumer` | Partie en direct |
| `ws://HOST/ws/matchmaking/?token=JWT` | `MatchmakingConsumer` | File d'attente |

Variable frontend : `NEXT_PUBLIC_WS_URL=ws://localhost:8000`

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
{ "event": "chat", "message": "Bonne partie !" }
```

### Serveur → client

```json
{ "event": "game_state", "data": { "game": { ... } } }
{ "event": "rejoindre_partie", "data": { "ok": true } }
{ "event": "partie_demarree", "data": { "game": { ... } } }
{ "event": "recevoir_coup", "data": { "game": { ... }, "last_move": { ... } } }
{ "event": "fin_partie", "data": { "game_over": true, "game": { ... } } }
{ "event": "error", "data": { "message": "..." } }
```

## Règles serveur

- Seuls les participants (blanc/noir) peuvent se connecter
- `jouer_coup` : validation via `GameService.make_move` (tour, légalité, chrono)
- Coup diffusé aux deux joueurs via Redis channel `game_<uuid>`
- Reconnexion : `rejoindre_partie` renvoie `game_state` complet (FEN + historique)

## Matchmaking WebSocket

```json
{ "event": "rejoindre_file", "mode": "blitz" }
```

Réponses : `en_attente` ou `match_found` avec `game_id` et `room_id`.

## Frontend

- Hook : `frontend/src/hooks/useGameWebSocket.ts`
- Exemple URL : `frontend/src/lib/gameWs.ts`
- Page : `/play` utilise WS pour parties humaines, REST pour IA

## Exemple JavaScript

```javascript
const token = "VOTRE_ACCESS_JWT";
const gameId = "UUID-PARTIE";
const ws = new WebSocket(
  `ws://localhost:8000/ws/game/${gameId}/?token=${encodeURIComponent(token)}`
);

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

ws.send(JSON.stringify({ event: "jouer_coup", uci: "e2e4", spent_ms: 2000 }));
```

## Migration

```bash
docker compose exec backend python manage.py migrate games
```

## Fichiers modifiés

- `backend/apps/games/models.py` — GameRoom, Move.from_square/to_square
- `backend/apps/games/consumers.py` — ChessConsumer, MatchmakingConsumer
- `backend/apps/games/routing.py`, `middleware.py`, `room_utils.py`, `realtime_services.py`
- `backend/config/asgi.py` — JwtAuthMiddlewareStack
- `frontend/src/app/play/page.tsx`, `hooks/useGameWebSocket.ts`
