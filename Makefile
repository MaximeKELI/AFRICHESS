.PHONY: up down logs migrate superuser demo

up:
	docker compose up -d db redis backend
	@echo "Backend: http://localhost:8000/api/docs/"
	@echo "Run 'make frontend' in another terminal for the UI"

frontend:
	cd frontend && npm run dev

down:
	docker compose down

logs:
	docker compose logs -f backend

migrate:
	docker exec africhess-backend-1 python manage.py migrate

superuser:
	docker exec -it africhess-backend-1 python manage.py createsuperuser

demo:
	docker exec africhess-backend-1 python manage.py shell -c "from django.contrib.auth import get_user_model; U=get_user_model(); U.objects.update_or_create(username='demo', defaults={'email':'demo@africhess.com','country':'SN'}); u=U.objects.get(username='demo'); u.set_password('demo1234'); u.save(); print('demo / demo1234')"
