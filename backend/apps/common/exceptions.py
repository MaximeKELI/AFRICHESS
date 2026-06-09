from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def africhess_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None and isinstance(exc, Throttled):
        wait = getattr(exc, "wait", None)
        if wait and wait > 60:
            minutes = max(1, int(wait // 60))
            detail = (
                f"Trop de tentatives. Réessayez dans environ {minutes} minute"
                f"{'s' if minutes > 1 else ''}."
            )
        else:
            detail = "Trop de tentatives. Attendez quelques instants puis réessayez."
        response.data = {"detail": detail}
    return response
