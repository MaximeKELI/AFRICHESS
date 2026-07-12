"""Moteur tournoi — arène / suisse / knockout (parité Lichess allégée)."""

from __future__ import annotations

import random

from django.db import transaction
from django.db.models import Count, Sum
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

    def set_availability(self, tournament: Tournament, user, available: bool) -> dict:
        tp = TournamentParticipant.objects.filter(
            tournament=tournament, user=user
        ).first()
        if not tp:
            return {"error": "Non inscrit"}
        tp.is_available = available
        tp.save(update_fields=["is_available"])
        return {"ok": True, "is_available": available}

    def withdraw(self, tournament: Tournament, user) -> dict:
        """Retrait : avant le départ = désinscription ; pendant arène = pause."""
        if tournament.status in (
            Tournament.Status.UPCOMING,
            Tournament.Status.REGISTRATION,
        ):
            deleted, _ = TournamentParticipant.objects.filter(
                tournament=tournament, user=user
            ).delete()
            tournament.participants.remove(user)
            if not deleted:
                return {"error": "Non inscrit"}
            return {"ok": True, "status": "unregistered"}
        if tournament.status == Tournament.Status.ACTIVE:
            return self.set_availability(tournament, user, False)
        return {"error": "Tournoi terminé"}

    def start_tournament(self, tournament: Tournament) -> Tournament:
        if tournament.status not in (
            Tournament.Status.REGISTRATION,
            Tournament.Status.UPCOMING,
        ):
            raise ValueError("Tournoi déjà démarré ou terminé")
        if self.participant_count(tournament) < 2:
            raise ValueError("Au moins 2 participants requis")
        if tournament.format == Tournament.Format.TEAM_BATTLE:
            if not tournament.club_a_id or not tournament.club_b_id:
                raise ValueError("Team battle requiert club_a et club_b")
        tournament.status = Tournament.Status.ACTIVE
        tournament.current_round = 1
        if not tournament.total_rounds:
            n = self.participant_count(tournament)
            tournament.total_rounds = max(3, min(7, (n - 1).bit_length() + 2))
        # Arène : durée par défaut 30 min si ends_at absent
        if (
            tournament.format
            in (
                Tournament.Format.ARENA,
                Tournament.Format.CLUB_ARENA,
                Tournament.Format.TEAM_BATTLE,
            )
            and not tournament.ends_at
        ):
            tournament.ends_at = timezone.now() + timezone.timedelta(minutes=30)
        tournament.save(
            update_fields=["status", "current_round", "total_rounds", "ends_at"]
        )
        if tournament.format in (
            Tournament.Format.ARENA,
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        ):
            self._start_arena_round(tournament, 1)
        elif tournament.format == Tournament.Format.KNOCKOUT:
            self._start_knockout_round(tournament, 1)
        else:
            self._start_swiss_round(tournament, 1)
        return tournament

    def maybe_complete_arena(self, tournament: Tournament) -> bool:
        """Termine l'arène si ends_at dépassé. Retourne True si complété."""
        if tournament.format not in (
            Tournament.Format.ARENA,
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        ):
            return False
        if tournament.status != Tournament.Status.ACTIVE:
            return False
        if not tournament.ends_at or timezone.now() < tournament.ends_at:
            return False
        tournament.status = Tournament.Status.COMPLETED
        tournament.save(update_fields=["status"])
        return True

    def _create_tournament_game(self, tournament: Tournament, white, black) -> Game:
        rated = bool(getattr(tournament, "is_rated", True))
        if tournament.format == Tournament.Format.DAILY:
            from apps.games.correspondence import create_correspondence_game

            game = create_correspondence_game(
                white, black, days_per_move=tournament.days_per_move or 3
            )
            if hasattr(game, "is_rated"):
                game.is_rated = rated
                game.save(update_fields=["is_rated"])
            return game
        return GameService().create_friend_game(
            white=white,
            black=black,
            mode=tournament.mode,
            is_rated=rated,
        )

    def _same_club_forbidden(self, tournament: Tournament) -> bool:
        return tournament.format in (
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        )

    def _played_pairs(self, tournament: Tournament) -> set[tuple[int, int]]:
        pairs = set()
        for rnd in TournamentRound.objects.filter(tournament=tournament):
            for game in rnd.games.all():
                if game.white_player_id and game.black_player_id:
                    a, b = sorted([game.white_player_id, game.black_player_id])
                    pairs.add((a, b))
        return pairs

    def _start_arena_round(self, tournament: Tournament, round_no: int):
        # Tri par score puis mélange léger (proximité type Lichess)
        standings = list(
            TournamentParticipant.objects.filter(tournament=tournament)
            .select_related("user")
            .order_by("-score", "-wins")
        )
        players = [tp for tp in standings]
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        used: set[int] = set()
        for i, a in enumerate(players):
            if a.user_id in used:
                continue
            partner = None
            for b in players[i + 1 :]:
                if b.user_id in used:
                    continue
                if self._same_club_forbidden(tournament):
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
            elif game.result == Game.Result.DRAW:
                # Rematch immédiat sur nulle (évite bracket cassé)
                if game.white_player and game.black_player:
                    rematch = self._create_tournament_game(
                        tournament, game.white_player, game.black_player
                    )
                    rematch.tournament = tournament
                    rematch.save(update_fields=["tournament"])
                    rnd.games.add(rematch)
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
            # Bye knockout = qualification (2 pts arène-style pour standings)
            tp.score += 2
            tp.wins += 1
            tp.save(update_fields=["score", "wins"])

    def _maybe_advance_knockout(self, tournament: Tournament):
        current = tournament.current_round or 1
        if not self._round_complete(tournament, current):
            return
        winners = self._knockout_winners(tournament, current)
        # Si des rematchs ont été créés, round pas encore complète
        if not self._round_complete(tournament, current):
            return
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
            TournamentParticipant.objects.filter(tournament=tournament)
            .select_related("user")
            .order_by("-score", "-wins")
        )
        if len(standings) < 2:
            return
        played = self._played_pairs(tournament)
        rnd = TournamentRound.objects.create(
            tournament=tournament, round_number=round_no
        )
        paired: set[int] = set()
        games_created = 0
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
            games_created += 1

        # Bye 1 point pour le joueur non apparié (parité Lichess Swiss)
        unpaired = [s for s in standings if s.user_id not in paired]
        if unpaired:
            bye = unpaired[-1]  # plus bas au classement
            bye.score += 1.0
            bye.games_played += 1
            bye.save(update_fields=["score", "games_played"])

        if games_created == 0 and not unpaired:
            tournament.status = Tournament.Status.COMPLETED
            tournament.save(update_fields=["status"])

    def _score_delta(self, tournament: Tournament, is_win: bool, is_draw: bool) -> float:
        """Arène 2/1/0 — Suisse/Daily/Knockout 1/½/0 (parité Lichess)."""
        if tournament.format in (
            Tournament.Format.ARENA,
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        ):
            if is_draw:
                return 1.0
            return 2.0 if is_win else 0.0
        if is_draw:
            return 0.5
        return 1.0 if is_win else 0.0

    @transaction.atomic
    def record_result(self, game: Game):
        if not game.tournament_id or game.status != Game.Status.COMPLETED:
            return
        game = Game.objects.select_for_update().get(pk=game.pk)
        if game.tournament_recorded:
            return
        tournament = game.tournament
        if tournament.status == Tournament.Status.COMPLETED:
            game.tournament_recorded = True
            game.save(update_fields=["tournament_recorded"])
            return

        for user in (game.white_player, game.black_player):
            if not user:
                continue
            tp, _ = TournamentParticipant.objects.get_or_create(
                tournament=tournament, user=user
            )
            tp.games_played += 1
            is_draw = game.result == Game.Result.DRAW
            is_win = (
                (game.result == Game.Result.WHITE_WIN and user == game.white_player)
                or (game.result == Game.Result.BLACK_WIN and user == game.black_player)
            )
            if is_draw:
                tp.draws += 1
            elif is_win:
                tp.wins += 1
            else:
                tp.losses += 1
            tp.score += self._score_delta(tournament, is_win, is_draw)
            tp.save()

        game.tournament_recorded = True
        game.save(update_fields=["tournament_recorded"])

        if tournament.format == Tournament.Format.SWISS:
            self._maybe_advance_swiss(tournament)
        elif tournament.format == Tournament.Format.DAILY:
            self._maybe_advance_swiss(tournament)
        elif tournament.format == Tournament.Format.KNOCKOUT:
            self._maybe_advance_knockout(tournament)
        elif tournament.format in (
            Tournament.Format.ARENA,
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        ):
            if not self.maybe_complete_arena(tournament):
                self._arena_repair(tournament, game)

    def _round_complete(self, tournament: Tournament, round_no: int) -> bool:
        rnd = TournamentRound.objects.filter(
            tournament=tournament, round_number=round_no
        ).first()
        if not rnd:
            return False
        games = list(rnd.games.all())
        if not games:
            return True  # bye-only round
        return all(g.status == Game.Status.COMPLETED for g in games)

    def _maybe_advance_swiss(self, tournament: Tournament):
        current = tournament.current_round or 1
        if not self._round_complete(tournament, current):
            return
        total = tournament.total_rounds or 5
        if current < total:
            tournament.current_round = current + 1
            tournament.save(update_fields=["current_round"])
            before = tournament.status
            self._start_swiss_round(tournament, current + 1)
            tournament.refresh_from_db()
            if tournament.status == before and tournament.status == Tournament.Status.ACTIVE:
                # Si 0 parties créées et déjà complété dans _start_swiss_round
                pass
        else:
            tournament.status = Tournament.Status.COMPLETED
            tournament.save(update_fields=["status"])

    def _arena_repair(self, tournament: Tournament, finished_game: Game):
        if self.maybe_complete_arena(tournament):
            return
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
        # Arène Lichess : rematch autorisé sauf adversaire immédiat
        last_pair = None
        if finished_game.white_player_id and finished_game.black_player_id:
            last_pair = tuple(
                sorted([finished_game.white_player_id, finished_game.black_player_id])
            )
        used: set[int] = set()
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
                # Interdit rematch immédiat seulement
                if last_pair and key == last_pair:
                    continue
                # Rematchs anciens autorisés en arène (pas en suisse)
                if self._same_club_forbidden(tournament):
                    if a.club_id and b.club_id and a.club_id == b.club_id:
                        continue
                partner = b
                break
            if not partner:
                # Fallback : autoriser rematch immédiat si personne d'autre
                for b in available[i + 1 :]:
                    if b.user_id in used:
                        continue
                    if self._same_club_forbidden(tournament):
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
        ).select_related("user", "user__stats", "club")

    def get_team_scores(self, tournament: Tournament) -> list[dict]:
        if tournament.format != Tournament.Format.TEAM_BATTLE:
            return []
        rows = (
            TournamentParticipant.objects.filter(
                tournament=tournament, club_id__isnull=False
            )
            .values("club_id", "club__name", "club__slug")
            .annotate(
                total_score=Sum("score"),
                total_wins=Sum("wins"),
                members=Count("id"),
            )
        )
        out = []
        for row in rows:
            out.append(
                {
                    "club_id": row["club_id"],
                    "club_name": row["club__name"],
                    "club_slug": row["club__slug"],
                    "score": float(row["total_score"] or 0),
                    "wins": row["total_wins"] or 0,
                    "members": row["members"],
                }
            )
        out.sort(key=lambda x: (x["score"], x["wins"]), reverse=True)
        return out
