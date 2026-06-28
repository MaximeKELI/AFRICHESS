"""Règles de classement ELO (style Chess.com)."""

# Parties en ligne classées requises pour un classement établi (par mode).
PROVISIONAL_GAMES_REQUIRED = 5

RATED_MODES = frozenset({"bullet", "blitz", "rapid", "classical"})
