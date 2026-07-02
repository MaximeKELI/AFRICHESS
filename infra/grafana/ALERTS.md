# Alertes Grafana — AFRICHESS

Règles provisionnées automatiquement au démarrage de Grafana (dossier **AFRICHESS Alerts**).

## Configuration Slack / email

1. Éditer `provisioning/alerting/contact-points.yml`
2. Remplacer l'URL webhook Slack (`https://hooks.slack.com/services/...`)
3. Adapter `ops@africhess.com` pour l'email
4. Redémarrer Grafana :

```bash
docker compose -f infra/docker-compose.production.yml restart grafana
```

## Alertes actives

| Alerte | Seuil | Durée | Sévérité |
|--------|-------|-------|----------|
| WS connexions actives | > 200 000 | 5 min | critical |
| WS connexions actives | > 150 000 | 10 min | warning |
| Matchmaking p99 | > 500 ms | 3 min | warning |
| File matchmaking | > 5 000 joueurs | 5 min | warning |
| Celery analysis backlog | p95 > 5 min + débit > 0.5/s | 10 min | critical |
| Celery fairplay échecs | > 10 % | 5 min | warning |
| Shadow pool AIE | > 1 000 profils | 10 min | warning |
| Cas revue fair play | > 200 en attente | 15 min | warning |
| API HTTP p99 | > 2 s | 5 min | warning |
| Postgres connexions | > 80 % max | 5 min | critical |

## Routage

- **critical** → Slack `#africhess-alerts` + email ops
- **warning** → Slack uniquement
- Répétition : toutes les 4 h si l'alerte reste active

Politiques : `provisioning/alerting/notification-policies.yml`

## Test manuel

Grafana → **Alerting** → **Alert rules** → sélectionner une règle → **Test rule**

Ou simuler une métrique :

```bash
# Dans un shell Python (dev)
from apps.common.metrics import WS_CONNECTIONS_ACTIVE
WS_CONNECTIONS_ACTIVE.labels(tier="ws").set(250000)
```

## HPA Kubernetes (lien alertes → scale)

L'alerte WS 150k/200k doit déclencher manuellement ou via :
- **KEDA** ScaledObject sur `africhess_ws_connections_active`
- ou runbook : `kubectl scale deployment/africhess-ws -n africhess --replicas=N`

Voir `infra/k8s/hpa.yaml` pour l'autoscaling automatique CPU (compléter avec prometheus-adapter).
