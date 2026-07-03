"""Création de parties par défi direct — logique partagée."""

from __future__ import annotations

from apps.games.odds import fen_for_odds
from apps.games.services import GameService, MatchmakingService
from apps.games.time_control import default_time_control_for_mode
from apps.notifications.models import Notification
from apps.social.relationships import are_friends, is_blocked


class ChallengeError(Exception):
    def __init__(self, message: str, status: int = 400, code: str = ""):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def create_player_challenge(
    challenger,
    opponent,
    *,
    require_friends: bool = False,
    mode: str = "blitz",
    odds: str = "none",
    is_rated: bool = False,
    is_timed: bool = True,
    time_control: str | None = None,
):
    if opponent.id == challenger.id:
        raise ChallengeError("Impossible", 400)
    if is_blocked(challenger, opponent) or is_blocked(opponent, challenger):
        raise ChallengeError("Action non autorisée", 403)
    if require_friends and not are_friends(challenger, opponent):
        raise ChallengeError("Vous devez être amis", 403)

    if is_timed and not time_control:
        time_control = default_time_control_for_mode(mode)

    if is_rated:
        try:
            MatchmakingService()._check_fairplay(challenger, True)
        except ValueError as exc:
            raise ChallengeError(str(exc), 403, "fairplay_sanction") from exc

    starting_fen = fen_for_odds(odds)
    game = GameService().create_friend_game(
        challenger,
        opponent,
        mode=mode,
        is_rated=bool(is_rated),
        is_timed=bool(is_timed),
        time_control=time_control,
        starting_fen=starting_fen,
        odds_preset=odds if odds and odds != "none" else "",
    )
    Notification.objects.create(
        user=opponent,
        type=Notification.Type.GAME_INVITE,
        title=f"{challenger.display_name or challenger.username} vous défie",
        body=f"Partie {mode} — rejoignez la partie",
        data={
            "game_id": str(game.id),
            "mode": mode,
            "from_username": challenger.username,
        },
    )
    return game
