from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import LearningProfile


@receiver(post_save, sender="users.User")
def create_learning_profile(sender, instance, created, **kwargs):
    if created:
        LearningProfile.objects.get_or_create(user=instance)
