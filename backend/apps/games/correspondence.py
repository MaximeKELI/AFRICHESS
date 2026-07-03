"""Parties par correspondance (daily chess)."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from apps.ratings.models import PlayerRating

from .models import CorrespondenceQueue, Game
from .room_utils import ensure_game_room
from .draw_rules import init_repetition_counts
from .variant_utils import starting_position_for_variant

User = get_user_model()

ELO_RANGE = 200


def create_correspondence_game(
    white,
    black,
    *,
    days_per_move: int = 3,
) -> Game:
    days = max(1, min(int(days_per_move), 14))
    now = timezone.now()
    fen, chess960_pos = starting_position_for_variant("standard")
    game = Game.objects.create(
        white_player=white,
        black_player=black,
        mode=Game.Mode.CORRESPONDENCE,
        status=Game.Status.ACTIVE,
        fen=fen,
        chess960_position_id=chess960_pos,
        repetition_counts=init_repetition_counts(fen, "standard"),
        is_timed=False,
        is_rated=False,
        days_per_move=days,
        turn_deadline=now + timedelta(days=days),
        started_at=now,
    )
    ensure_game_room(game)
    return game


def my_correspondence_games(user):
    return (
        Game.objects.filter(
            Q(white_player=user) | Q(black_player=user),
            mode=Game.Mode.CORRESPONDENCE,
            status=Game.Status.ACTIVE,
        )
        .select_related("white_player", "black_player")
        .order_by("turn_deadline")
    )


def user_on_vacation(user) -> bool:
    until = getattr(user, "vacation_until", None)
    return bool(until and until > timezone.now())


def refresh_turn_deadline(game: Game) -> None:
    if game.mode != Game.Mode.CORRESPONDENCE or game.status != Game.Status.ACTIVE:
        return
    # Ne pas raccourcir l'échéance si le joueur actif est en vacances
    import chess

    board = chess.Board(game.fen)
    mover = game.white_player if board.turn == chess.WHITE else game.black_player
    if mover and user_on_vacation(mover):
        return
    game.turn_deadline = timezone.now() + timedelta(days=game.days_per_move or 3)
    game.save(update_fields=["turn_deadline"])


class CorrespondenceMatchmakingService:
    """Appariement pool ouvert pour daily chess."""

    def join_queue(self, user, days_per_move: int = 3) -> Game | None:
        days = max(1, min(int(days_per_move), 14))
        rating = PlayerRating.objects.filter(user=user, mode="rapid").first()
        elo = rating.elo if rating else user.initial_elo
        game = self._find_match(user, days, elo)
        if game:
            return game
        CorrespondenceQueue.objects.update_or_create(
            user=user,
            defaults={"days_per_move": days, "elo": elo},
        )
        return self._pair_waiting()

    def leave_queue(self, user) -> None:
        CorrespondenceQueue.objects.filter(user=user).delete()

    def _find_match(self, user, days: int, elo: int) -> Game | None:
        candidate = (
            CorrespondenceQueue.objects.filter(
                days_per_move=days,
                elo__gte=elo - ELO_RANGE,
                elo__lte=elo + ELO_RANGE,
            )
            .exclude(user=user)
            .order_by("joined_at")
            .first()
        )
        if not candidate:
            return None
        self.leave_queue(user)
        self.leave_queue(candidate.user)
        return create_correspondence_game(user, candidate.user, days_per_move=days)

    def _pair_waiting(self) -> Game | None:
        entries = list(CorrespondenceQueue.objects.order_by("joined_at"))
        used = set()
        for i, a in enumerate(entries):
            if a.user_id in used:
                continue
            for b in entries[i + 1 :]:
                if b.user_id in used or b.user_id == a.user_id:
                    continue
                if a.days_per_move != b.days_per_move:
                    continue
                if abs(a.elo - b.elo) > ELO_RANGE:
                    continue
                used.add(a.user_id)
                used.add(b.user_id)
                self.leave_queue(a.user)
                self.leave_queue(b.user)
                return create_correspondence_game(
                    a.user, b.user, days_per_move=a.days_per_move
                )
        return None
