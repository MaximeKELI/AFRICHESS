"""Tests de reconnaissance des ouvertures (livre enrichi ~3800 lignes)."""

from django.test import SimpleTestCase

from apps.games.openings_data import _BOOK, lookup_opening, path_key_from_moves


class OpeningBookTests(SimpleTestCase):
    def test_book_is_loaded_and_large(self):
        # Le livre doit contenir plusieurs milliers d'ouvertures.
        self.assertGreater(len(_BOOK), 2000)

    def test_empty_line_is_starting_position(self):
        self.assertEqual(lookup_opening([], "fr")["name"], "Position initiale")
        self.assertEqual(lookup_opening([], "en")["name"], "Starting position")

    def test_bird_opening_recognized(self):
        # Cas signalé par l'utilisateur : f4 ne doit plus rester « f4 ».
        info = lookup_opening(["f4"], "fr")
        self.assertIn("oiseau", info["name"].lower())
        self.assertNotEqual(info["name"], "f4")
        self.assertEqual(info["eco"], "A02")

    def test_common_openings(self):
        cases = {
            ("e4", "c5"): ("sicil", "B"),
            ("e4", "e6"): ("françai", "C"),
            ("e4", "c6"): ("caro", "B"),
            ("d4", "d5", "c4", "e6"): ("gambit dame", "D"),
            ("d4", "d5", "c4", "dxc4"): ("gambit dame accept", "D"),
            ("c4",): ("anglaise", "A"),
            ("b3",): ("nimzo-larsen", "A"),
            ("g4",): ("grob", "A"),
        }
        for moves, (needle, eco_prefix) in cases.items():
            info = lookup_opening(list(moves), "fr")
            self.assertIn(needle, info["name"].lower(), moves)
            self.assertTrue(info["eco"].startswith(eco_prefix), (moves, info["eco"]))

    def test_longest_prefix_matching(self):
        # La Najdorf est reconnue même après plusieurs coups supplémentaires.
        moves = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]
        info = lookup_opening(moves, "fr")
        self.assertIn("najdorf", info["name"].lower())
        self.assertEqual(info["eco"], "B90")

    def test_check_and_annotation_symbols_are_ignored(self):
        base = lookup_opening(["e4", "e5", "Nf3", "Nc6", "Bb5"], "fr")
        decorated = lookup_opening(["e4", "e5", "Nf3", "Nc6", "Bb5+"], "fr")
        self.assertEqual(base["name"], decorated["name"])
        self.assertIn("espagnole", base["name"].lower())

    def test_children_are_returned_for_known_line(self):
        info = lookup_opening(["e4"], "fr")
        self.assertIn("c5", info["children"])
        self.assertIn("e5", info["children"])

    def test_english_locale_uses_english_names(self):
        self.assertEqual(lookup_opening(["e4", "c5"], "en")["name"], "Sicilian Defense")

    def test_unknown_token_falls_back_without_crashing(self):
        info = lookup_opening(["Zz9"], "fr")
        self.assertEqual(info["name"], "Zz9")
        self.assertEqual(info["eco"], "")

    def test_path_key_normalizes_moves(self):
        self.assertEqual(path_key_from_moves(["e4", "c5", "Nf3+"]), "e4 c5 Nf3")
