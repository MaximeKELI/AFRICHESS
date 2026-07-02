from django.test import TestCase

import chess

from apps.games.draw_rules import (
    board_from_game_moves,
    bump_repetition_count,
    can_claim_threefold_from_game,
    init_repetition_counts,
    rebuild_repetition_counts,
)
from apps.games.models import Game, Move


class ThreefoldRepetitionTests(TestCase):
    REPEAT_UCIS = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1"]

    def _play_ucis_on_board(self, ucis: list[str]) -> str:
        board = chess.Board()
        for uci in ucis:
            board.push_uci(uci)
        return board.fen()

    def test_detects_threefold_legacy_replay(self):
        """Parties sans repetition_counts → fallback replay O(n)."""
        game = Game.objects.create(is_vs_ai=True, mode="blitz")
        for i, uci in enumerate(self.REPEAT_UCIS, start=1):
            Move.objects.create(
                game=game,
                move_number=i,
                san=f"m{i}",
                uci=uci,
                from_square=uci[:2],
                to_square=uci[2:4],
                played_by_white=i % 2 == 1,
            )
        self.assertTrue(can_claim_threefold_from_game(game))
        self.assertTrue(board_from_game_moves(game).can_claim_threefold_repetition())

    def test_incremental_counts_match_replay(self):
        """Compteurs incrémentaux → même verdict que python-chess."""
        game = Game.objects.create(
            is_vs_ai=True,
            mode="blitz",
            repetition_counts=init_repetition_counts(
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                "standard",
            ),
        )
        for i, uci in enumerate(self.REPEAT_UCIS, start=1):
            Move.objects.create(
                game=game,
                move_number=i,
                san=f"m{i}",
                uci=uci,
                from_square=uci[:2],
                to_square=uci[2:4],
                played_by_white=i % 2 == 1,
            )
            game.fen = self._play_ucis_on_board(self.REPEAT_UCIS[:i])
            bump_repetition_count(game)
            game.move_count = i
        game.save()
        self.assertTrue(can_claim_threefold_from_game(game))
        self.assertEqual(
            can_claim_threefold_from_game(game),
            board_from_game_moves(game).can_claim_threefold_repetition(),
        )

    def test_rebuild_after_takeback_shape(self):
        game = Game.objects.create(is_vs_ai=True, mode="blitz")
        for i, uci in enumerate(self.REPEAT_UCIS[:4], start=1):
            Move.objects.create(
                game=game,
                move_number=i,
                san=f"m{i}",
                uci=uci,
                from_square=uci[:2],
                to_square=uci[2:4],
                played_by_white=i % 2 == 1,
                fen_after=self._play_ucis_on_board(self.REPEAT_UCIS[:i]),
            )
        game.fen = self._play_ucis_on_board(self.REPEAT_UCIS[:4])
        game.move_count = 4
        counts = rebuild_repetition_counts(game)
        game.repetition_counts = counts
        game.save()
        self.assertFalse(can_claim_threefold_from_game(game))
