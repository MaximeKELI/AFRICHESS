from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from .events import log_event


@receiver(user_logged_in)
def on_user_login(sender, request, user, **kwargs):
    log_event("login", user=user, path=request.path if request else "", request=request)


@receiver(user_logged_out)
def on_user_logout(sender, request, user, **kwargs):
    if user:
        log_event("logout", user=user, path=request.path if request else "", request=request)
