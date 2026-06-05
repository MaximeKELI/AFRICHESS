from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
    label = "users"

    def ready(self):
        import apps.users.signals  # noqa: F401
        from django.db.models.signals import post_migrate

        def setup_oauth(sender, **kwargs):
            if kwargs.get("app_config") and kwargs["app_config"].label != self.label:
                return
            try:
                from apps.users.social_setup import ensure_oauth_apps

                ensure_oauth_apps()
            except Exception as exc:
                import logging

                logging.getLogger(__name__).warning("OAuth bootstrap skipped: %s", exc)

        post_migrate.connect(setup_oauth, sender=self)
