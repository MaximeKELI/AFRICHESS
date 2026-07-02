from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserStats
from .profile_cache import invalidate_featured_african, invalidate_public_profile

User = get_user_model()
DISPATCH_UID = "africhess_create_user_stats"


@receiver(post_save, sender=User, dispatch_uid=DISPATCH_UID)
def create_user_stats(sender, instance, created, **kwargs):
    # Stats créés dans RegisterSerializer.create via setup_new_user()
    # (évite doublon avec l'ancienne vue qui recréait UserStats)
    if created and kwargs.get("raw"):
        UserStats.objects.get_or_create(user=instance)


@receiver(post_save, sender=User, dispatch_uid="africhess_invalidate_profile_cache")
def invalidate_user_profile_cache(sender, instance, **kwargs):
    invalidate_public_profile(instance.username)
    update_fields = kwargs.get("update_fields")
    if instance.is_african_highlight or update_fields is None or "is_african_highlight" in update_fields:
        invalidate_featured_african()


@receiver(post_save, sender=UserStats, dispatch_uid="africhess_invalidate_stats_cache")
def invalidate_stats_profile_cache(sender, instance, **kwargs):
    if instance.user_id:
        invalidate_public_profile(instance.user.username)
