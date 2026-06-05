from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"

    def ready(self):
        import apps.users.signals  # noqa: F401
        try:
            from apps.users.social_setup import ensure_oauth_apps

            ensure_oauth_apps()
        except Exception as exc:
            import logging

            logging.getLogger(__name__).warning("User bootstrap skipped: %s", exc)
