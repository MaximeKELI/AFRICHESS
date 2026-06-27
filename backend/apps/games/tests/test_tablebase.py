"""Tests tablebases Lichess."""

from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.games.tablebase import probe_tablebase

VALID_FEN = "8/8/8/8/8/4P3/8/4k2K w - - 0 1"


class TablebaseTests(SimpleTestCase):
    @patch("apps.games.tablebase.requests.get")
    def test_probe_tablebase_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"category": "win", "dtm": 12}
        mock_get.return_value = mock_resp
        result = probe_tablebase(VALID_FEN)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["category"], "win")
        self.assertTrue(result["won"])

    @patch("apps.games.tablebase.requests.get")
    def test_probe_tablebase_failure(self, mock_get):
        mock_get.side_effect = Exception("network")
        self.assertIsNone(probe_tablebase(VALID_FEN))

    def test_probe_tablebase_too_many_pieces(self):
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        self.assertIsNone(probe_tablebase(fen))

    def test_probe_tablebase_invalid_fen(self):
        self.assertIsNone(probe_tablebase("not-a-fen"))
