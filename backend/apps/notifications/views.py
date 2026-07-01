from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken, Notification
from .serializers import (
    DeviceTokenRegisterSerializer,
    DeviceTokenUnregisterSerializer,
    NotificationSerializer,
)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:50]


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
        return Response({"status": "ok"})


class MarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "ok"})


class VapidPublicKeyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        key = getattr(settings, "VAPID_PUBLIC_KEY", "") or ""
        if not key:
            return Response({"public_key": None, "enabled": False})
        return Response({"public_key": key, "enabled": True})


class DeviceRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = DeviceTokenRegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        subscription = data.get("subscription") or {}
        token = data["token"]
        if data["kind"] == DeviceToken.Kind.WEBPUSH and subscription.get("endpoint"):
            token = subscription["endpoint"]

        DeviceToken.objects.update_or_create(
            user=request.user,
            token=token,
            defaults={
                "platform": data["platform"],
                "kind": data["kind"],
                "subscription_json": subscription if data["kind"] == DeviceToken.Kind.WEBPUSH else {},
                "device_id": data.get("device_id") or "",
                "is_active": True,
            },
        )
        return Response({"status": "registered"}, status=status.HTTP_201_CREATED)


class DeviceUnregisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        ser = DeviceTokenUnregisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        qs = DeviceToken.objects.filter(user=request.user, is_active=True)
        if data.get("token"):
            qs = qs.filter(token=data["token"])
        elif data.get("device_id"):
            qs = qs.filter(device_id=data["device_id"])
        else:
            return Response({"error": "token or device_id required"}, status=400)
        updated = qs.update(is_active=False)
        return Response({"status": "ok", "removed": updated})
