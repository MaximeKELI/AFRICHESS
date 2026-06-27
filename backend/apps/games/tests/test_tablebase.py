"""Tests tablebases Lichess."""

from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.games.tablebase import probe_tablebase, tablebase_summary


class TablebaseTests(SimpleTestCase):
    @patch("apps.games.tablebase.requests.get")
    def test_probe_tablebase_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"category": "win", "dtm": 12}
        mock_get.return_value = mock_resp
        result = probe_tablebase("KPPK", "4k3/8/8/8/8/8/4PPP/4K3 w - - 0 1")
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["category"], "win")
        self.assertEqual(result["dtm"], 12)

    @patch("apps.games.tablebase.requests.get")
    def test_probe_tablebase_failure(self, mock_get):
        mock_get.side_effect = Exception("network")
        self.assertIsNone(probe_tablebase("KPPK", "invalid"))

    def test_tablebase_summary_no_data(self):
        self.assertEqual(tablebase_summary(None), "")

    def test_tablebase_summary_win(self):
        text = tablebase_summary({"category": "win", "dtm": 5})
        self.assertIn("gagne", text.lower())
