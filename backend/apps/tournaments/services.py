"""Moteur tournoi — arène et suisse simplifiés."""

import random

from django.utils import timezone

from apps.games.models import Game
from apps.games.services import GameService

from .models import Tournament, TournamentParticipant, TournamentRound


class TournamentEngine:
    def ensure_participant(self, tournament: Tournament, user):
        tournament.participants.add(user)
        TournamentParticipant.objects.get_or_create(
            tournament=tournament, user=user
        )

    def start_tournament(self, tournament: Tournament) -> Tournament:
        if tournament.participants.count() < 2:
            raise ValueError("Au moins 2 participants requis")
        tournament.status = Tournament.Status.ACTIVE
        tournament.save(update_fields=["status"])
        if tournament.format == Tournament.Format.ARENA:
            self._start_arena_round(tournament, 1)
        else:
            self._start_swiss_round(tournament, 1)
        return tournament

    def _start_arena_round(self, tournament: Tournament, round_no: int):
        players = list(tournament.participants.all())
        random.shuffle(players)
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        svc = GameService()
        for i in range(0, len(players) - 1, 2):
            white, black = players[i], players[i + 1]
            game = svc.create_friend_game(white=white, black=black, mode=tournament.mode)
            game.tournament = tournament
            game.save(update_fields=["tournament"])
            rnd.games.add(game)

    def _start_swiss_round(self, tournament: Tournament, round_no: int):
        standings = list(
            TournamentParticipant.objects.filter(tournament=tournament).order_by(
                "-score", "-wins"
            )
        )
        if len(standings) < 2:
            standings = [
                TournamentParticipant.objects.get_or_create(
                    tournament=tournament, user=u
                )[0]
                for u in tournament.participants.all()
            ]
        random.shuffle(standings)
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        svc = GameService()
        paired = set()
        for i, sa in enumerate(standings):
            if sa.user_id in paired:
                continue
            opponent = None
            for j in range(i + 1, len(standings)):
                sb = standings[j]
                if sb.user_id not in paired:
                    opponent = sb
                    break
            if not opponent:
                continue
            paired.add(sa.user_id)
            paired.add(opponent.user_id)
            white_user, black_user = sa.user, opponent.user
            if random.random() > 0.5:
                white_user, black_user = black_user, white_user
            game = svc.create_friend_game(
                white=white_user, black=black_user, mode=tournament.mode
            )
            game.tournament = tournament
            game.save(update_fields=["tournament"])
            rnd.games.add(game)

    def record_result(self, game: Game):
        if not game.tournament_id or game.status != Game.Status.COMPLETED:
            return
        tournament = game.tournament
        for user, result in (
            (game.white_player, game.result),
            (game.black_player, game.result),
        ):
            if not user:
                continue
            tp, _ = TournamentParticipant.objects.get_or_create(
                tournament=tournament, user=user
            )
            tp.games_played += 1
            if result == Game.Result.DRAW:
                tp.draws += 1
                tp.score += 1
            elif (
                result == Game.Result.WHITE_WIN and user == game.white_player
            ) or (result == Game.Result.BLACK_WIN and user == game.black_player):
                tp.wins += 1
                tp.score += 2
            else:
                tp.losses += 1
            tp.save()

    def get_standings(self, tournament: Tournament):
        return TournamentParticipant.objects.filter(
            tournament=tournament
        ).select_related("user")
