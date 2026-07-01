from celery import shared_task


@shared_task(name="notifications.send_native_push")
def send_native_push_task(notification_id: int) -> None:
    from .models import Notification
    from .push_native import deliver_notification_push

    try:
        notification = Notification.objects.get(pk=notification_id)
    except Notification.DoesNotExist:
        return
    deliver_notification_push(notification)
