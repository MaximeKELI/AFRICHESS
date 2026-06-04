from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserStats

User = get_user_model()
DISPATCH_UID = "africhess_create_user_stats"


@receiver(post_save, sender=User, dispatch_uid=DISPATCH_UID)
def create_user_stats(sender, instance, created, **kwargs):
    # Stats créés dans RegisterSerializer.create via setup_new_user()
    # (évite doublon avec l'ancienne vue qui recréait UserStats)
    if created and kwargs.get("raw"):
        UserStats.objects.get_or_create(user=instance)
