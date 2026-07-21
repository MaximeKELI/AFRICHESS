.PHONY: all bootstrap dev up up-all down logs migrate seed-bots superuser demo frontend hybrid mobile mobile-android mobile-chrome mobile-test mobile-emulator

# Install deps + Docker stack + frontend (commande unique)
# Usage quotidien : make dev  (ou make bootstrap)
all bootstrap dev:
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

# Flutter — Linux desktop
mobile:
	cd mobile && flutter pub get && flutter run -d linux

# Flutter — démarre AVD Medium_Phone + run (hôte = 10.0.2.2 depuis l’émulateur)
mobile-emulator:
	chmod +x scripts/run-android-emulator.sh
	./scripts/run-android-emulator.sh Medium_Phone

mobile-android:
	export ANDROID_HOME=$${ANDROID_HOME:-$$HOME/Android/Sdk}; \
	export PATH="$$ANDROID_HOME/emulator:$$ANDROID_HOME/platform-tools:$$PATH"; \
	cd mobile && flutter run -d android \
		--dart-define=API_URL=http://10.0.2.2:8000/api \
		--dart-define=WS_URL=ws://10.0.2.2:8000

mobile-chrome:
	cd mobile && flutter run -d chrome

mobile-test:
	cd mobile && flutter test

down:
	docker compose down

logs:
	docker compose logs -f backend

migrate:
	docker compose exec backend python manage.py migrate

seed-bots:
	docker compose exec backend python manage.py seed_bots --deactivate-old

superuser:
	docker compose exec backend python manage.py createsuperuser

demo:
	docker compose exec backend python manage.py shell -c "from django.contrib.auth import get_user_model; U=get_user_model(); U.objects.update_or_create(username='demo', defaults={'email':'demo@africhess.com','country':'SN'}); u=U.objects.get(username='demo'); u.set_password('demo1234'); u.save(); print('demo / demo1234')"
