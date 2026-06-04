from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"

    def ready(self):
        # Import once; dispatch_uid prevents duplicate handlers on reload
        import apps.users.signals  # noqa: F401
