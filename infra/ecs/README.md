# ECS Fargate / EC2 — AFRICHESS af-south-1

Alternative à Kubernetes pour déployer sur **Amazon ECS**.

## Architecture ECS

| Service ECS | Task definition | Capacity | ALB |
|-------------|-----------------|----------|-----|
| `africhess-api` | `task-definition-api.json` | Fargate 2 vCPU | `/api/*` |
| `africhess-ws` | `task-definition-ws.json` | Fargate 4 vCPU | `/ws/*` sticky |
| `africhess-celery-analysis` | `task-definition-celery-analysis.json` | EC2 c6i.4xlarge | — |
| `africhess-celery-fairplay` | (copier analysis, queue `fairplay`) | EC2 CPU | — |
| `africhess-celery-realtime` | (queue `realtime`) | Fargate léger | — |

**Stockfish et fair play C++** : toujours sur capacity provider **EC2 CPU-only**, jamais Fargate WS.

## Enregistrer les task definitions

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition-api.json \
  --region af-south-1

aws ecs register-task-definition \
  --cli-input-json file://task-definition-ws.json \
  --region af-south-1

aws ecs register-task-definition \
  --cli-input-json file://task-definition-celery-analysis.json \
  --region af-south-1
```

## ALB + sticky WebSocket

```bash
# Target group WS — stickiness 3600s
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:af-south-1:...:targetgroup/africhess-ws/... \
  --attributes Key=stickiness.enabled,Value=true \
               Key=stickiness.type,Value=lb_cookie \
               Key=stickiness.lb_cookie.duration_seconds,Value=3600
```

## Autoscaling

- **API** : target tracking CPU 65 %
- **WS** : custom metric CloudWatch depuis Prometheus (`AfrichessWsConnectionsActive`)
- **Celery analysis** : scale sur longueur queue Redis (`LLEN celery`)

## Secrets

Utiliser **AWS Secrets Manager** (`africhess/prod`) — ARNs à adapter dans les JSON.
