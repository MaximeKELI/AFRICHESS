"""Moteur tournoi — arène et suisse simplifiés."""

import random

from django.utils import timezone

from apps.games.models import Game
from apps.games.services import GameService

from .models import Tournament, TournamentParticipant, TournamentRound


class TournamentEngine:
    def participant_users(self, tournament: Tournament):
        return [
            tp.user
            for tp in TournamentParticipant.objects.filter(
                tournament=tournament
            ).select_related("user")
        ]

    def participant_count(self, tournament: Tournament) -> int:
        return TournamentParticipant.objects.filter(tournament=tournament).count()

    def ensure_participant(self, tournament: Tournament, user):
        TournamentParticipant.objects.get_or_create(
            tournament=tournament, user=user
        )
        tournament.participants.add(user)

    def start_tournament(self, tournament: Tournament) -> Tournament:
        if self.participant_count(tournament) < 2:
            raise ValueError("Au moins 2 participants requis")
        tournament.status = Tournament.Status.ACTIVE
        tournament.current_round = 1
        if not tournament.total_rounds:
            n = self.participant_count(tournament)
            tournament.total_rounds = max(3, min(7, (n - 1).bit_length() + 2))
        tournament.save(update_fields=["status", "current_round", "total_rounds"])
        if tournament.format in (Tournament.Format.ARENA, Tournament.Format.CLUB_ARENA):
            self._start_arena_round(tournament, 1)
        elif tournament.format == Tournament.Format.KNOCKOUT:
            self._start_knockout_round(tournament, 1)
        else:
            self._start_swiss_round(tournament, 1)
        return tournament

    def _create_tournament_game(self, tournament: Tournament, white, black) -> Game:
        if tournament.format == Tournament.Format.DAILY:
            from apps.games.correspondence import create_correspondence_game

            return create_correspondence_game(
                white, black, days_per_move=tournament.days_per_move or 3
            )
        return GameService().create_friend_game(
            white=white, black=black, mode=tournament.mode, is_rated=False
        )

    def _participant_club_id(self, tournament: Tournament, user_id: int) -> int | None:
        tp = TournamentParticipant.objects.filter(
            tournament=tournament, user_id=user_id
        ).first()
        return tp.club_id if tp else None

    def _played_pairs(self, tournament: Tournament) -> set[tuple[int, int]]:
        pairs = set()
        for rnd in TournamentRound.objects.filter(tournament=tournament):
            for game in rnd.games.all():
                if game.white_player_id and game.black_player_id:
                    a, b = sorted([game.white_player_id, game.black_player_id])
                    pairs.add((a, b))
        return pairs

    def _start_arena_round(self, tournament: Tournament, round_no: int):
        players = self.participant_users(tournament)
        random.shuffle(players)
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        svc = GameService()
        for i in range(0, len(players) - 1, 2):
            white, black = players[i], players[i + 1]
            game = self._create_tournament_game(tournament, white, black)
            game.tournament = tournament
            game.save(update_fields=["tournament"])
            rnd.games.add(game)
            TournamentParticipant.objects.filter(
                tournament=tournament, user__in=[white, black]
            ).update(is_available=False)

    def _knockout_winners(self, tournament: Tournament, round_no: int) -> list:
        rnd = TournamentRound.objects.filter(
            tournament=tournament, round_number=round_no
        ).first()
        if not rnd:
            return []
        winners = []
        for game in rnd.games.select_related("white_player", "black_player"):
            if game.status != Game.Status.COMPLETED:
                continue
            if game.result == Game.Result.WHITE_WIN:
                winners.append(game.white_player)
            elif game.result == Game.Result.BLACK_WIN:
                winners.append(game.black_player)
        return [w for w in winners if w]

    def _start_knockout_round(self, tournament: Tournament, round_no: int):
        if round_no == 1:
            players = self.participant_users(tournament)
            random.shuffle(players)
        else:
            players = self._knockout_winners(tournament, round_no - 1)
        if len(players) < 2:
            tournament.status = Tournament.Status.COMPLETED
            tournament.save(update_fields=["status"])
            return
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        for i in range(0, len(players) - 1, 2):
            white, black = players[i], players[i + 1]
            game = self._create_tournament_game(tournament, white, black)
            game.tournament = tournament
            game.save(update_fields=["tournament"])
            rnd.games.add(game)
        if len(players) % 2 == 1:
            bye_user = players[-1]
            tp, _ = TournamentParticipant.objects.get_or_create(
                tournament=tournament, user=bye_user
            )
            tp.score += 2
            tp.wins += 1
            tp.save()

    def _maybe_advance_knockout(self, tournament: Tournament):
        current = tournament.current_round or 1
        if not self._round_complete(tournament, current):
            return
        winners = self._knockout_winners(tournament, current)
        if len(winners) <= 1:
            tournament.status = Tournament.Status.COMPLETED
            tournament.save(update_fields=["status"])
            return
        tournament.current_round = current + 1
        tournament.total_rounds = max(tournament.total_rounds or 1, current + 1)
        tournament.save(update_fields=["current_round", "total_rounds"])
        self._start_knockout_round(tournament, current + 1)

    def _start_swiss_round(self, tournament: Tournament, round_no: int):
        standings = list(
            TournamentParticipant.objects.filter(tournament=tournament).order_by(
                "-score", "-wins"
            )
        )
        if len(standings) < 2:
            standings = list(
                TournamentParticipant.objects.filter(
                    tournament=tournament
                ).select_related("user")
            )
        played = self._played_pairs(tournament)
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        paired = set()
        for i, sa in enumerate(standings):
            if sa.user_id in paired:
                continue
            opponent = None
            for j in range(i + 1, len(standings)):
                sb = standings[j]
                if sb.user_id in paired:
                    continue
                key = tuple(sorted([sa.user_id, sb.user_id]))
                if key in played:
                    continue
                opponent = sb
                break
            if not opponent:
                continue
            paired.add(sa.user_id)
            paired.add(opponent.user_id)
            white_user, black_user = sa.user, opponent.user
            if random.random() > 0.5:
                white_user, black_user = black_user, white_user
            game = self._create_tournament_game(tournament, white_user, black_user)
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

        if tournament.format == Tournament.Format.SWISS:
            self._maybe_advance_swiss(tournament)
        if tournament.format == Tournament.Format.KNOCKOUT:
            self._maybe_advance_knockout(tournament)
        if tournament.format in (Tournament.Format.ARENA, Tournament.Format.CLUB_ARENA):
            self._arena_repair(tournament, game)

    def _round_complete(self, tournament: Tournament, round_no: int) -> bool:
        rnd = TournamentRound.objects.filter(
            tournament=tournament, round_number=round_no
        ).first()
        if not rnd:
            return False
        games = list(rnd.games.all())
        return bool(games) and all(g.status == Game.Status.COMPLETED for g in games)

    def _maybe_advance_swiss(self, tournament: Tournament):
        current = tournament.current_round or 1
        if not self._round_complete(tournament, current):
            return
        total = tournament.total_rounds or 5
        if current < total:
            tournament.current_round = current + 1
            tournament.save(update_fields=["current_round"])
            self._start_swiss_round(tournament, current + 1)
        else:
            tournament.status = Tournament.Status.COMPLETED
            tournament.save(update_fields=["status"])

    def _arena_repair(self, tournament: Tournament, finished_game: Game):
        users = [finished_game.white_player, finished_game.black_player]
        TournamentParticipant.objects.filter(
            tournament=tournament, user__in=[u for u in users if u]
        ).update(is_available=True)

        available = list(
            TournamentParticipant.objects.filter(
                tournament=tournament, is_available=True
            ).order_by("-score", "-wins")
        )
        played = self._played_pairs(tournament)
        used = set()
        current_round = (
            TournamentRound.objects.filter(tournament=tournament)
            .order_by("-round_number")
            .first()
        )
        if not current_round:
            return

        for i, a in enumerate(available):
            if a.user_id in used:
                continue
            partner = None
            for b in available[i + 1 :]:
                if b.user_id in used:
                    continue
                key = tuple(sorted([a.user_id, b.user_id]))
                if key in played:
                    continue
                if tournament.format == Tournament.Format.CLUB_ARENA:
                    if a.club_id and b.club_id and a.club_id == b.club_id:
                        continue
                partner = b
                break
            if not partner:
                continue
            used.add(a.user_id)
            used.add(partner.user_id)
            white, black = a.user, partner.user
            if random.random() > 0.5:
                white, black = black, white
            new_game = self._create_tournament_game(tournament, white, black)
            new_game.tournament = tournament
            new_game.save(update_fields=["tournament"])
            current_round.games.add(new_game)
            TournamentParticipant.objects.filter(
                tournament=tournament, user__in=[white, black]
            ).update(is_available=False)

    def get_standings(self, tournament: Tournament):
        return TournamentParticipant.objects.filter(
            tournament=tournament
        ).select_related("user")
