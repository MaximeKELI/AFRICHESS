from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .totp_service import generate_totp_secret, provisioning_uri, verify_totp


def _require_password(request) -> Response | None:
    password = request.data.get("password") or ""
    if not password or not request.user.check_password(password):
        return Response({"error": "Mot de passe requis ou incorrect"}, status=400)
    return None


class TotpSetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        err = _require_password(request)
        if err:
            return err
        user = request.user
        if user.totp_enabled:
            return Response({"error": "2FA déjà activée"}, status=400)
        secret = generate_totp_secret()
        user.totp_secret = secret
        user.save(update_fields=["totp_secret"])
        return Response(
            {
                "secret": secret,
                "uri": provisioning_uri(secret, user.username),
            }
        )


class TotpEnableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        err = _require_password(request)
        if err:
            return err
        user = request.user
        code = request.data.get("code", "")
        if not user.totp_secret:
            return Response({"error": "Configurez d'abord la 2FA"}, status=400)
        if not verify_totp(user.totp_secret, code):
            return Response({"error": "Code invalide"}, status=400)
        user.totp_enabled = True
        user.save(update_fields=["totp_enabled"])
        return Response({"ok": True, "totp_enabled": True})


class TotpDisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        err = _require_password(request)
        if err:
            return err
        user = request.user
        code = request.data.get("code", "")
        if user.totp_enabled and not verify_totp(user.totp_secret, code):
            return Response({"error": "Code invalide"}, status=400)
        user.totp_enabled = False
        user.totp_secret = ""
        user.save(update_fields=["totp_enabled", "totp_secret"])
        return Response({"ok": True, "totp_enabled": False})


class TotpStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"totp_enabled": bool(request.user.totp_enabled)})
