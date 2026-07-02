# Infrastructure production AFRICHESS

Stack multi-rôles pour **100 M connexions WS / jour** — voir [docs/ARCHITECTURE_SCALE.md](../docs/ARCHITECTURE_SCALE.md).

## Démarrage rapide

```bash
cp .env.production.example .env.production
docker compose -f docker-compose.production.yml --env-file .env.production up -d migrate
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

- API : `http://localhost/api/`
- WS : `ws://localhost/ws/`
- Prometheus : `http://localhost:9090`
- Grafana : `http://localhost:3001` (admin / mot de passe `.env`)

## Tiers

| Service | Variable | Commande |
|---------|----------|----------|
| API HTTP | `AFRICHESS_TIER=api` | Gunicorn + Uvicorn |
| WebSocket | `AFRICHESS_TIER=ws` | Daphne `asgi_ws` |
| Dev (tout-en-un) | `AFRICHESS_TIER=all` | Daphne `asgi` |

## Production AWS (af-south-1)

Utiliser ce compose comme référence ; en prod réelle :
- **ECS/EKS** avec autoscaling sur `africhess_ws_connections_active`
- **RDS** Multi-AZ + réplicas
- **ElastiCache** Redis Cluster (remplacer service `redis` unique)
- **Cloudflare** en frontal (voir doc architecture)
