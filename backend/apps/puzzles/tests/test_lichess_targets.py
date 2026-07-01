from django.test import SimpleTestCase

from apps.puzzles.lichess_import import MIN_PUZZLE_POOL, rating_targets_for_limit


class LichessImportTargetsTests(SimpleTestCase):
    def test_default_pool_is_10k(self):
        self.assertEqual(MIN_PUZZLE_POOL, 10_000)

    def test_targets_sum_to_limit(self):
        targets = rating_targets_for_limit(10_000)
        self.assertEqual(sum(targets.values()), 10_000)
        self.assertEqual(targets["easy"], 2500)
        self.assertEqual(targets["expert"], 2500)
