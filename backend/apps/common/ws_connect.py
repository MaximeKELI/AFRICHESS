"""Helpers connexion WebSocket (sous-protocole bearer côté client)."""


def websocket_subprotocol(scope) -> str | None:
    for name, value in scope.get("headers", []):
        if name == b"sec-websocket-protocol":
            parts = [p.strip() for p in value.decode().split(",") if p.strip()]
            if "bearer" in parts:
                return "bearer"
            return parts[0] if parts else None
    return None


async def accept_websocket(consumer) -> None:
    subprotocol = websocket_subprotocol(consumer.scope)
    if subprotocol:
        await consumer.accept(subprotocol=subprotocol)
    else:
        await consumer.accept()
