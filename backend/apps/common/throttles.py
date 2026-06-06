from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthAnonThrottle(AnonRateThrottle):
    rate = "20/hour"


class AuthUserThrottle(UserRateThrottle):
    rate = "60/hour"


class AnalyzeThrottle(UserRateThrottle):
    rate = "30/hour"
