from django.test import SimpleTestCase

from apps.games.time_control import resolve_time_fields


class ResolveTimeFieldsTests(SimpleTestCase):
    def test_untimed(self):
        self.assertEqual(resolve_time_fields(False), (False, 0, 0, 0, None))

    def test_preset_blitz_3_2(self):
        timed, w, b, inc, tcm = resolve_time_fields(True, time_control="3+2")
        self.assertTrue(timed)
        self.assertEqual(w, 180_000)
        self.assertEqual(b, 180_000)
        self.assertEqual(inc, 2_000)
        self.assertEqual(tcm, 3)

    def test_preset_bullet_1_1(self):
        _, _, _, inc, tcm = resolve_time_fields(True, time_control="1+1")
        self.assertEqual(inc, 1_000)
        self.assertEqual(tcm, 1)

    def test_legacy_minutes(self):
        _, w, _, inc, tcm = resolve_time_fields(True, time_minutes=15)
        self.assertEqual(w, 900_000)
        self.assertEqual(inc, 0)
        self.assertEqual(tcm, 15)
