from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthAnonThrottle(AnonRateThrottle):
    scope = "auth"


class AuthUserThrottle(UserRateThrottle):
    scope = "auth"


class AnalyzeThrottle(UserRateThrottle):
    scope = "analyze"
