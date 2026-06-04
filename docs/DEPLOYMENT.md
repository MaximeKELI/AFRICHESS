# AFRICHESS — Deployment Guide

## Production Environment Variables

```env
SECRET_KEY=<strong-random-key>
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
ALLOWED_HOSTS=africhess.com,api.africhess.com
POSTGRES_HOST=<managed-db-host>
REDIS_URL=redis://<redis-host>:6379/0
CORS_ALLOWED_ORIGINS=https://africhess.com
SECURE_SSL_REDIRECT=True
STOCKFISH_PATH=/usr/games/stockfish
```

## Docker Production

1. Build images: `docker compose -f docker-compose.yml build`
2. Use a reverse proxy (Nginx/Caddy) for TLS
3. Run migrations: `docker compose run backend python manage.py migrate`
4. Collect static: `docker compose run backend python manage.py collectstatic --noinput`

## Cloud Options

### AWS
- **ECS/Fargate** for backend + frontend containers
- **RDS PostgreSQL** for database
- **ElastiCache Redis** for Channels/Celery
- **S3 + CloudFront** for media/static
- **ALB** with WebSocket support

### DigitalOcean
- App Platform or Droplets + Managed PostgreSQL + Managed Redis

### Railway / Render
- Deploy `backend` and `frontend` as separate services
- Add PostgreSQL and Redis plugins

## Scaling

- **Daphne/Uvicorn** workers behind load balancer (sticky sessions for WebSockets)
- **Celery workers** for game analysis, notifications
- **Redis** channel layer for multi-instance WebSocket broadcast

## CI/CD (GitHub Actions example)

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python manage.py check
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to your cloud provider"
```

## Security Checklist

- [ ] Rotate `SECRET_KEY`
- [ ] Enable HTTPS everywhere
- [ ] Restrict `ALLOWED_HOSTS` and CORS
- [ ] Use managed secrets (AWS Secrets Manager, etc.)
- [ ] Rate-limit auth endpoints
- [ ] Regular dependency updates
