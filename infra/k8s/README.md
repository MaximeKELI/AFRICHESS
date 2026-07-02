# Kubernetes (EKS) — AFRICHESS af-south-1

Manifestes pour déployer la stack multi-rôles sur **Amazon EKS** (Le Cap).

## Prérequis

- Cluster EKS `af-south-1` avec node groups :
  - `general` — API + WS (c6i.2xlarge)
  - `cpu-intensive` — Celery analysis/fairplay (c6i.4xlarge), label `workload=cpu-intensive`
- **RDS** Postgres Multi-AZ + réplica lecture
- **ElastiCache** Redis Cluster Mode
- **ECR** : image `africhess-backend`
- **AWS Load Balancer Controller** + certificat ACM
- (Optionnel) **Prometheus Operator** pour ServiceMonitor + HPA custom

## Déploiement

```bash
# 1. Secrets (ne pas utiliser secret.example.yaml en prod)
cp secret.example.yaml secret.yaml
# éditer secret.yaml puis :
kubectl apply -f secret.yaml

# 2. ConfigMap — adapter hosts RDS/ElastiCache
kubectl apply -f configmap.yaml

# 3. Stack complète via Kustomize
kubectl apply -k .

# Ou fichier par fichier
kubectl apply -f namespace.yaml
kubectl apply -f pgbouncer.yaml
kubectl apply -f api.yaml
kubectl apply -f ws.yaml
kubectl apply -f celery.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

## Migrations

```bash
kubectl run migrate --rm -it -n africhess \
  --image=123456789012.dkr.ecr.af-south-1.amazonaws.com/africhess-backend:latest \
  --env-from=configmap/africhess-config \
  --env-from=secret/africhess-secrets \
  --command -- python manage.py migrate --noinput
```

## Autoscaling WS sur métrique custom

1. Installer [prometheus-adapter](https://github.com/kubernetes-sigs/prometheus-adapter)
2. Décommenter la métrique `africhess_ws_connections_active` dans `hpa.yaml`
3. Règle adapter :

```yaml
rules:
  - seriesQuery: 'africhess_ws_connections_active'
    resources:
      overrides:
        namespace: { resource: namespace }
        pod: { resource: pod }
    name:
      matches: "africhess_ws_connections_active"
      as: "africhess_ws_connections_active"
    metricsQuery: 'sum(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)'
```

Cible : **~12 000 connexions / pod WS** avant scale-out.

## Cloudflare

Pointer `api.africhess.com` et `ws.africhess.com` vers l'ALB EKS (CNAME orange cloud).
Activer WebSocket proxy vers `ws.africhess.com`.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `api.yaml` | Deployment + Service API (Gunicorn) |
| `ws.yaml` | Deployment + Service WS (Daphne, sticky ClientIP) |
| `celery.yaml` | Workers realtime / analysis / fairplay / default + beat |
| `hpa.yaml` | Autoscaling API 4–16, WS 8–32, analysis 4–12 |
| `ingress.yaml` | ALB avec sticky cookie WS |
| `pgbouncer.yaml` | Pool connexions vers RDS |
| `servicemonitor.yaml` | Scraping `/metrics` (Prometheus Operator) |

Voir aussi [docs/ARCHITECTURE_SCALE.md](../../docs/ARCHITECTURE_SCALE.md).
