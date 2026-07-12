"""Défis directs — invitation puis acceptation avant création de partie."""

from __future__ import annotations

from django.db.models import Q
from django.utils import timezone

from apps.games.odds import fen_for_odds
from apps.games.services import GameService, MatchmakingService
from apps.games.time_control import default_time_control_for_mode
from apps.notifications.models import Notification
from apps.social.relationships import are_friends, is_blocked

from .models import GameChallenge


class ChallengeError(Exception):
    def __init__(self, message: str, status: int = 400, code: str = ""):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def _pending_between(user_a, user_b) -> GameChallenge | None:
    return (
        GameChallenge.objects.filter(
            status=GameChallenge.Status.PENDING,
        )
        .filter(
            Q(challenger=user_a, opponent=user_b) | Q(challenger=user_b, opponent=user_a)
        )
        .select_related("challenger", "opponent")
        .first()
    )


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

    existing = _pending_between(challenger, opponent)
    if existing:
        if existing.challenger_id == challenger.id:
            raise ChallengeError("Un défi est déjà en attente pour ce joueur", 400, "challenge_pending")
        raise ChallengeError(
            "Ce joueur vous a déjà défié — consultez vos notifications",
            400,
            "challenge_pending_inverse",
        )

    challenge = GameChallenge.objects.create(
        challenger=challenger,
        opponent=opponent,
        mode=mode,
        odds=odds or "none",
        is_rated=bool(is_rated),
        is_timed=bool(is_timed),
        time_control=time_control or "",
    )
    Notification.objects.create(
        user=opponent,
        type=Notification.Type.GAME_INVITE,
        title=f"{challenger.display_name or challenger.username} vous défie",
        body=f"Partie {mode} — acceptez ou refusez le défi",
        data={
            "challenge_id": challenge.id,
            "mode": mode,
            "from_username": challenger.username,
            "time_control": time_control or "",
        },
    )
    return challenge


def accept_challenge(challenge: GameChallenge, user) -> GameChallenge:
    if challenge.status != GameChallenge.Status.PENDING:
        raise ChallengeError("Ce défi n'est plus disponible", 400)
    if challenge.opponent_id != user.id:
        raise ChallengeError("Action non autorisée", 403)

    if challenge.is_rated:
        try:
            MatchmakingService()._check_fairplay(user, True)
        except ValueError as exc:
            raise ChallengeError(str(exc), 403, "fairplay_sanction") from exc

    white = challenge.challenger if challenge.challenger_plays_white else challenge.opponent
    black = challenge.opponent if challenge.challenger_plays_white else challenge.challenger
    starting_fen = fen_for_odds(challenge.odds)
    game = GameService().create_friend_game(
        white,
        black,
        mode=challenge.mode,
        is_rated=challenge.is_rated,
        is_timed=challenge.is_timed,
        time_control=challenge.time_control or None,
        starting_fen=starting_fen,
        odds_preset=challenge.odds if challenge.odds and challenge.odds != "none" else "",
    )
    challenge.status = GameChallenge.Status.ACCEPTED
    challenge.game = game
    challenge.responded_at = timezone.now()
    challenge.save(update_fields=["status", "game", "responded_at"])

    _notify_challenge_started(challenge, game)
    return challenge


def _notify_challenge_started(challenge: GameChallenge, game) -> None:
    """Les deux joueurs reçoivent match_found pour rejoindre l'échiquier automatiquement."""
    for user in (challenge.challenger, challenge.opponent):
        opp = challenge.opponent if user.id == challenge.challenger_id else challenge.challenger
        Notification.objects.create(
            user=user,
            type=Notification.Type.MATCH_FOUND,
            title="Défi accepté — c'est parti !",
            body=f"Partie {challenge.mode} vs {opp.display_name or opp.username}",
            data={
                "game_id": str(game.id),
                "mode": challenge.mode,
                "from_username": opp.username,
                "challenge_id": challenge.id,
                "action": "challenge_accepted",
            },
        )


def decline_challenge(challenge: GameChallenge, user) -> GameChallenge:
    if challenge.status != GameChallenge.Status.PENDING:
        raise ChallengeError("Ce défi n'est plus disponible", 400)
    if challenge.opponent_id != user.id:
        raise ChallengeError("Action non autorisée", 403)

    challenge.status = GameChallenge.Status.DECLINED
    challenge.responded_at = timezone.now()
    challenge.save(update_fields=["status", "responded_at"])

    Notification.objects.create(
        user=challenge.challenger,
        type=Notification.Type.SYSTEM,
        title=f"{user.display_name or user.username} a refusé votre défi",
        body=f"Partie {challenge.mode}",
        data={"challenge_id": challenge.id, "from_username": user.username},
    )
    return challenge


def cancel_challenge(challenge: GameChallenge, user) -> GameChallenge:
    if challenge.status != GameChallenge.Status.PENDING:
        raise ChallengeError("Ce défi n'est plus disponible", 400)
    if challenge.challenger_id != user.id:
        raise ChallengeError("Action non autorisée", 403)

    challenge.status = GameChallenge.Status.CANCELLED
    challenge.responded_at = timezone.now()
    challenge.save(update_fields=["status", "responded_at"])
    return challenge


def create_lobby_seek(
    challenger,
    *,
    mode: str = "blitz",
    is_rated: bool = False,
    is_timed: bool = True,
    time_control: str | None = None,
    color: str = "random",
):
    """Seek ouvert type Lichess lobby — opponent=None jusqu'à acceptation."""
    if is_timed and not time_control:
        time_control = default_time_control_for_mode(mode)

    if is_rated:
        try:
            MatchmakingService()._check_fairplay(challenger, True)
        except ValueError as exc:
            raise ChallengeError(str(exc), 403, "fairplay_sanction") from exc

    existing = GameChallenge.objects.filter(
        challenger=challenger,
        opponent__isnull=True,
        status=GameChallenge.Status.PENDING,
    ).first()
    if existing:
        raise ChallengeError(
            "Vous avez déjà une partie en attente dans le lobby",
            400,
            "lobby_seek_pending",
        )

    if color == "white":
        challenger_plays_white = True
    elif color == "black":
        challenger_plays_white = False
    else:
        import random

        challenger_plays_white = random.choice([True, False])

    return GameChallenge.objects.create(
        challenger=challenger,
        opponent=None,
        mode=mode,
        odds="none",
        is_rated=bool(is_rated),
        is_timed=bool(is_timed),
        time_control=time_control or "",
        challenger_plays_white=challenger_plays_white,
    )


def list_open_seeks(*, exclude_user=None, include_own: bool = True):
    qs = (
        GameChallenge.objects.filter(
            opponent__isnull=True,
            status=GameChallenge.Status.PENDING,
        )
        .select_related("challenger")
        .order_by("-created_at")
    )
    if exclude_user is not None and not include_own:
        qs = qs.exclude(challenger=exclude_user)
    return qs[:50]


def accept_lobby_seek(challenge: GameChallenge, user) -> GameChallenge:
    if challenge.opponent_id is not None:
        raise ChallengeError("Ce n'est pas un seek lobby", 400)
    if challenge.status != GameChallenge.Status.PENDING:
        raise ChallengeError("Ce défi n'est plus disponible", 400)
    if challenge.challenger_id == user.id:
        raise ChallengeError("Impossible d'accepter votre propre seek", 400)

    if is_blocked(challenge.challenger, user) or is_blocked(user, challenge.challenger):
        raise ChallengeError("Action non autorisée", 403)

    if challenge.is_rated:
        try:
            MatchmakingService()._check_fairplay(user, True)
        except ValueError as exc:
            raise ChallengeError(str(exc), 403, "fairplay_sanction") from exc

    challenge.opponent = user
    challenge.save(update_fields=["opponent"])
    return accept_challenge(challenge, user)
