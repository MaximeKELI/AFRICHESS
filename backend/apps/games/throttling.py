from rest_framework.throttling import UserRateThrottle


class EngineEvalThrottle(UserRateThrottle):
    scope = "engine_eval"


class EngineHintThrottle(UserRateThrottle):
    """Indices IA en partie — quota large (pratiquement illimité)."""

    scope = "engine_hint"
