from rest_framework.throttling import UserRateThrottle


class EngineEvalThrottle(UserRateThrottle):
    scope = "engine_eval"
