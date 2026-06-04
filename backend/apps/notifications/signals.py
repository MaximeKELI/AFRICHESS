from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .services import push_notification_ws


@receiver(post_save, sender=Notification)
def notification_created_push_ws(sender, instance, created, **kwargs):
    if created:
        push_notification_ws(instance)
