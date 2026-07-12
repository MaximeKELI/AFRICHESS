from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthAnonThrottle(AnonRateThrottle):
    scope = "auth"


class AuthUserThrottle(UserRateThrottle):
    scope = "auth"


class LoginBurstThrottle(AnonRateThrottle):
    """Limite les rafales de tentatives login (anti brute-force)."""

    scope = "login_burst"


class AnalyzeThrottle(UserRateThrottle):
    scope = "analyze"


class ChatThrottle(UserRateThrottle):
    """Anti-spam chat / DM REST."""

    scope = "chat"
