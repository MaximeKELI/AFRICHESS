.PHONY: all bootstrap up up-all down logs migrate superuser demo frontend hybrid

# Install deps + Docker stack + frontend (commande unique)
all bootstrap:
	./scripts/dev-all.sh

up:
	docker compose up -d db redis backend celery celery-beat
	@echo "Backend: http://localhost:8000/api/docs/"
	@echo "Celery worker + beat started (matchmaking, forfeits)."
	@echo "Run 'make frontend' in another terminal for the UI"

up-all:
	docker compose up -d

# db/redis Docker + backend local + frontend
hybrid:
	./scripts/dev-hybrid.sh

frontend:
	cd frontend && npm run dev

down:
	docker compose down

logs:
	docker compose logs -f backend

migrate:
	docker compose exec backend python manage.py migrate

superuser:
	docker compose exec backend python manage.py createsuperuser

demo:
	docker compose exec backend python manage.py shell -c "from django.contrib.auth import get_user_model; U=get_user_model(); U.objects.update_or_create(username='demo', defaults={'email':'demo@africhess.com','country':'SN'}); u=U.objects.get(username='demo'); u.set_password('demo1234'); u.save(); print('demo / demo1234')"
