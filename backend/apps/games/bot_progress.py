"""Progression / déblocage bots style Chess.com."""

from __future__ import annotations

from django.db.models import Max

from .bot_tiers import unlock_ceiling
from .models import BotVictory, ChessBot, Game


def max_beaten_elo(user) -> int:
    if not user or not user.is_authenticated:
        return 0
    val = BotVictory.objects.filter(user=user).aggregate(m=Max("bot_elo"))["m"]
    return int(val or 0)


def is_bot_unlocked(user, bot: ChessBot) -> bool:
    """Bots ≤ plafond débloqués. Premium bots exigent aussi l'abo."""
    ceiling = unlock_ceiling(max_beaten_elo(user) if user and user.is_authenticated else 0)
    if bot.elo > ceiling:
        return False
    if bot.is_premium and user and user.is_authenticated and not getattr(user, "is_premium", False):
        return False
    if bot.is_premium and (not user or not user.is_authenticated):
        return False
    return True


def record_bot_victory(game: Game) -> BotVictory | None:
    """Enregistre une victoire humaine vs bot nommé."""
    if not game.is_vs_ai or not game.bot_id:
        return None
    if game.status != Game.Status.COMPLETED:
        return None
    if game.result not in (Game.Result.WHITE_WIN, Game.Result.BLACK_WIN):
        return None

    human = game.white_player or game.black_player
    if not human:
        return None

    # Humain a gagné ?
    human_is_white = game.white_player_id == human.id
    if human_is_white and game.result != Game.Result.WHITE_WIN:
        return None
    if not human_is_white and game.result != Game.Result.BLACK_WIN:
        return None

    bot = game.bot
    victory, _ = BotVictory.objects.get_or_create(
        user=human,
        bot=bot,
        defaults={"bot_elo": bot.elo, "game": game},
    )
    if victory.bot_elo != bot.elo:
        victory.bot_elo = bot.elo
        victory.save(update_fields=["bot_elo"])
    return victory


def ladder_payload(user, locale: str = "fr") -> dict:
    from .bot_tiers import BOT_TIERS
    from .serializers import ChessBotSerializer

    bots = list(ChessBot.objects.filter(is_active=True).order_by("elo", "name"))
    beaten = set()
    max_elo = 0
    if user and user.is_authenticated:
        qs = BotVictory.objects.filter(user=user).select_related("bot")
        beaten = {v.bot_id for v in qs}
        max_elo = max_beaten_elo(user)
    ceiling = unlock_ceiling(max_elo)
    is_premium = bool(user and user.is_authenticated and getattr(user, "is_premium", False))

    tiers_out = []
    for tier in BOT_TIERS:
        tier_bots = [b for b in bots if tier["min_elo"] <= b.elo <= tier["max_elo"]]
        items = []
        for b in tier_bots:
            unlocked = b.elo <= ceiling and (not b.is_premium or is_premium)
            items.append(
                {
                    **ChessBotSerializer(b).data,
                    "tier": tier["id"],
                    "unlocked": unlocked,
                    "beaten": b.id in beaten,
                    "locked_reason": (
                        "premium"
                        if b.is_premium and not is_premium
                        else ("progress" if b.elo > ceiling else None)
                    ),
                }
            )
        tiers_out.append(
            {
                "id": tier["id"],
                "label": tier["label_fr"] if locale.startswith("fr") else tier["label_en"],
                "description": (
                    tier["description_fr"] if locale.startswith("fr") else tier["description_en"]
                ),
                "min_elo": tier["min_elo"],
                "max_elo": tier["max_elo"],
                "preset_elo": tier["preset_elo"],
                "bots": items,
                "bots_count": len(items),
                "beaten_count": sum(1 for i in items if i["beaten"]),
            }
        )

    return {
        "max_beaten_elo": max_elo,
        "unlock_ceiling": ceiling,
        "tiers": tiers_out,
        "total_bots": len(bots),
        "total_beaten": len(beaten),
    }
