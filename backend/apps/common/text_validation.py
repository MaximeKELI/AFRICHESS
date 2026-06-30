"""Validation contenu texte utilisateur (forum, chat, etc.)."""

from __future__ import annotations

import re

from rest_framework import serializers

FORUM_BODY_MAX = 8000
FORUM_TITLE_MAX = 200
FORUM_COMMENT_MAX = 2000
CHAT_MESSAGE_MAX = 500

_UNSAFE = re.compile(
    r"<\s*script|javascript\s*:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed",
    re.IGNORECASE,
)


def validate_user_text(value: str, *, max_len: int, field: str = "content") -> str:
    text = (value or "").strip()
    if not text:
        raise serializers.ValidationError("Contenu vide.")
    if len(text) > max_len:
        raise serializers.ValidationError(f"Maximum {max_len} caractères.")
    if _UNSAFE.search(text):
        raise serializers.ValidationError("Balises ou scripts HTML non autorisés.")
    return text
