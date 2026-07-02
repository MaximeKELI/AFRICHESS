# Architecture scale — 100 M connexions / jour

Objectif : **~100 millions de connexions WebSocket par jour** (~1 150 conn/s en moyenne, **10–15 k conn/s** en pic soirée Afrique), avec séparation stricte des rôles et latence matchmaking < 500 ms.

## Capacité cible

| Métrique | Valeur |
|----------|--------|
| Connexions WS / jour | 100 M |
| Pic simultané (estimé) | 150–250 k |
| Coups / seconde (pic) | 5–20 k |
| Analyses Stockfish / jour | 2–5 M |
| Fair play (C++) / jour | 500 k–1 M |

## Topologie (af-south-1 — Le Cap)

```
                    ┌─────────────────────────────────────┐
                    │  Cloudflare CDN + WAF + DDoS        │
                    │  • Static Next.js / assets          │
                    │  • Argo Smart Routing → af-south-1  │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
        /api/* (REST)         /ws/* (WebSocket)    media R2/S3
              │                    │
    ┌─────────▼─────────┐  ┌─────▼──────────────┐
    │  ALB / Nginx       │  │  ALB sticky (ip_hash)│
    │  tier API          │  │  tier WS             │
    │  Gunicorn+Uvicorn  │  │  Daphne (asgi_ws)    │
    │  N × 4 workers     │  │  M × processus       │
    └─────────┬─────────┘  └─────┬────────────────┘
              │                    │
              └────────┬───────────┘
                       │
         ┌─────────────▼─────────────┐
         │  PgBouncer (transaction)   │
         │  max_client_conn: 10k+     │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │  Postgres primary (RDS)    │
         │  + 2 read replicas         │
         └───────────────────────────┘

    ┌──────────────────────────────────────────┐
    │  Redis Cluster (ElastiCache)            │
    │  DB0 Channels | DB1 Celery | DB2 MM     │
    └──────────────────────────────────────────┘

    ┌──────────────────────────────────────────┐
    │  Celery workers (nœuds CPU dédiés)      │
    │  • realtime (matchmaking, forfeits)     │
    │  • analysis (Stockfish pool)            │
    │  • fairplay (binaire C++ AIE)           │
    │  • default (push, premium)              │
    └──────────────────────────────────────────┘
```

## Séparation des rôles (ne plus tout mettre dans 1 Daphne)

| Tier | ASGI | Process manager | Rôle |
|------|------|-----------------|------|
| **API** | `config.asgi_http` | Gunicorn + UvicornWorker | REST, auth, CRUD, uploads |
| **WS** | `config.asgi_ws` | Daphne | Parties live, matchmaking WS, chat, notifs |
| **Workers** | — | Celery | Analyse, fair play, tâches planifiées |
| **Beat** | — | Celery Beat | Schedules uniquement |

Variable d'environnement : `AFRICHESS_TIER=api|ws|worker|beat|all` (voir `backend/docker-entrypoint.sh`).

## Dimensionnement indicatif (100 M/jour)

### WebSocket
- **8–16 nœuds** `c6i.2xlarge` (8 vCPU) — Daphne, ~15–20 k connexions/nœud
- Redis Cluster **6 nœuds** (3 primary + 3 replica) pour Channel Layer
- Sticky sessions (ip_hash / cookie) obligatoire

### API HTTP
- **4–8 nœuds** `c6i.xlarge` — Gunicorn 4 workers, stateless
- Cache Cloudflare pour endpoints publics (leaderboards, puzzles statiques)

### Postgres
- Primary : `db.r6g.2xlarge` (8 vCPU, 64 GB)
- **2 read replicas** pour listes, profils, historique
- PgBouncer : `pool_mode=transaction`, `default_pool_size=50` par nœud API/WS

### Celery / Stockfish
- **analysis** : 4–8 nœuds `c6i.4xlarge` CPU-only, concurrency=2 (1 Stockfish/process)
- **fairplay** : 2–4 nœuds identiques pour le binaire C++
- **realtime** : 2 nœuds légers (pas de moteur)
- Jamais sur les nœuds WS

## Files Celery

| Queue | Tâches | Workers |
|-------|--------|---------|
| `realtime` | matchmaking, forfeits | léger, I/O |
| `analysis` | Stockfish, game review, commentaires | CPU lourd |
| `fairplay` | AIE, sanctions | CPU + binaire C++ |
| `default` | push, premium | général |

Configuration : `CELERY_TASK_ROUTES` dans `backend/config/settings/base.py`.

## Redis

En production AWS :
- **ElastiCache Redis Cluster Mode Enabled** (3 shards minimum)
- URLs séparées :
  - `REDIS_CHANNELS_URLS` — pub/sub Channels (CSV)
  - `REDIS_CELERY_URL` — broker + résultats
  - `REDIS_MATCHMAKING_URL` — scripts Lua atomiques MM

## Observabilité

### Métriques applicatives (`/metrics`)
- `africhess_ws_connections_active` — connexions WS actives par tier
- `africhess_matchmaking_latency_seconds` — latence Redis pairing
- `africhess_matchmaking_queue_size` — joueurs en attente
- `africhess_matchmaking_shadow_queue_size` — file shadow AIE
- `africhess_fairplay_shadow_pool_users` — profils shadow pool
- `africhess_fairplay_pending_cases` — cas revue en attente
- `africhess_fairplay_auto_sanctions_total` — sanctions auto (shadow/applied)
- `africhess_celery_task_duration_seconds` — durée par queue/tâche
- `africhess_http_request_duration_seconds` — latence API

### Fair Play à l'échelle (Phase 5)

| Composant | Rôle |
|-----------|------|
| `fairplay_scale.py` | Stats ops, batch sync shadow pools |
| Celery `refresh_fairplay_scale_metrics` | Gauge Prometheus toutes les **60 s** |
| Celery `batch_sync_shadow_pools_task` | Réconciliation AIE toutes les **5 min** |
| Pools Redis `:shadow` | Joueurs signalés appariés entre eux (classé) |
| `FAIRPLAY_AUTO_SANCTIONS_SHADOW=true` | Log des sanctions auto sans appliquer (prod initiale) |

Activer les sanctions réelles : `FAIRPLAY_AUTO_SANCTIONS_ENABLED=true` + shadow=false après validation ops.

### Exporters infra (voir `infra/prometheus/prometheus.yml`)
- **redis_exporter** — longueur des queues Celery, mémoire
- **postgres_exporter** — connexions actives, réplication lag

### Grafana
- Dashboards : WS actives, p99 matchmaking, backlog Celery par queue, connexions DB vs `max_connections`
- **HPA WS** (`infra/k8s/hpa.yaml`) : scale sur `africhess_ws_connections_active` (~8000 conn/pod) via prometheus-adapter (`infra/k8s/prometheus-adapter-ws.yaml`), CPU en secours
- **Alertes provisionnées** : voir `infra/grafana/ALERTS.md`
  - WS > 200k (critical), > 150k (warning)
  - Matchmaking p99 > 500 ms
  - Celery analysis backlog (p95 > 5 min)
  - Postgres > 80 % connexions

## Cloudflare (frontal Afrique)

1. **DNS** : `africhess.com` → Cloudflare proxy ON
2. **Page Rules** : cache agressif `/static/*`, `/api/puzzles/daily`
3. **WebSocket** : upgrade activé vers origin `ws.africhess.com` (af-south-1)
4. **Argo** : routage optimisé vers Le Cap pour utilisateurs africains
5. **WAF** : rate limit `/api/auth/login`, challenge pays à risque

## Déploiement local / staging

```bash
cp infra/.env.production.example infra/.env.production
# éditer les secrets
docker compose -f infra/docker-compose.production.yml --env-file infra/.env.production up -d
```

Services : `api`, `ws`, `celery-*`, `pgbouncer`, `postgres-primary`, `postgres-replica`, `prometheus`, `grafana`.

## Coûts AWS indicatifs (af-south-1)

| Composant | Ordre de grandeur / mois |
|-----------|--------------------------|
| WS fleet (12 × c6i.2xlarge) | $4 000–6 000 |
| API fleet (6 × c6i.xlarge) | $1 500–2 500 |
| Celery CPU (8 × c6i.4xlarge) | $5 000–8 000 |
| RDS Postgres + replicas | $2 500–4 000 |
| ElastiCache Redis Cluster | $1 500–3 000 |
| Cloudflare Pro + Argo | $200–500 |
| **Total** | **~$15–24 k/mois** |

Optimisations : Reserved Instances, Spot pour workers analysis, autoscaling HPA sur métriques WS.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `backend/config/asgi_http.py` | Tier API HTTP seul |
| `backend/config/asgi_ws.py` | Tier WebSocket seul |
| `backend/config/db_router.py` | Lectures → réplica |
| `backend/apps/common/metrics.py` | Métriques Prometheus |
| `infra/docker-compose.production.yml` | Stack multi-rôles (Docker) |
| `infra/k8s/` | Manifestes EKS (HPA, Ingress ALB) |
| `infra/ecs/` | Task definitions ECS Fargate/EC2 |
| `infra/grafana/dashboards/africhess-scale.json` | Dashboard Grafana prêt à importer |
| `backend/apps/games/fairplay_scale.py` | AIE shadow pools batch + stats ops |
| `infra/nginx/nginx.conf` | Routage `/api` vs `/ws` |

## Migration depuis mono-Daphne

1. Déployer PgBouncer + pointer `PGBOUNCER_HOST`
2. Monter réplica + `USE_READ_REPLICA=true`
3. Lancer workers Celery par queue
4. Basculer trafic : Nginx `/api` → tier API, `/ws` → tier WS
5. Vérifier Grafana : WS actives, lag MM, queue analysis
