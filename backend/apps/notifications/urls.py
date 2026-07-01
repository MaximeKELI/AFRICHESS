from django.urls import path

from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notifications"),
    path("<int:pk>/read/", views.MarkReadView.as_view(), name="notification-read"),
    path("read-all/", views.MarkAllReadView.as_view(), name="notifications-read-all"),
    path("devices/", views.DeviceRegisterView.as_view(), name="notification-device-register"),
    path("devices/unregister/", views.DeviceUnregisterView.as_view(), name="notification-device-unregister"),
    path("push/vapid-key/", views.VapidPublicKeyView.as_view(), name="notification-vapid-key"),
]
