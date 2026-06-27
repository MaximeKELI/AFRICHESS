"""
Test de capacité — combien d'utilisateurs et de joueurs simultanés
la plateforme encaisse en 1 seconde.

Exécution :
  docker compose exec backend python manage.py test apps.games.tests.test_throughput_capacity -v 2

Benchmark HTTP réel (backend lancé) :
  python3 scripts/benchmark_1s.py
"""

from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.db import close_old_connections
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.games.engine import EngineMove
from apps.games.services import GameService

User = get_user_model()

_NO_THROTTLE = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.authentication.AfrichessJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}


@dataclass
class BurstResult:
    label: str
    duration_s: float
    attempts: int
    success: int
    errors: int

    @property
    def per_second(self) -> float:
        return self.success / self.duration_s if self.duration_s > 0 else 0.0

    @property
    def error_rate(self) -> float:
        return self.errors / self.attempts * 100 if self.attempts else 0.0

    def report(self) -> str:
        return (
            f"{self.label}: {self.success}/{self.attempts} OK en {self.duration_s:.3f}s "
            f"→ {self.per_second:.1f}/s (erreurs {self.error_rate:.1f}%)"
        )


@override_settings(REST_FRAMEWORK=_NO_THROTTLE)
class ThroughputCapacityTests(TestCase):
    """Mesure le débit API Django/DRF sur une fenêtre de 1 seconde."""

    burst_seconds = 1.0

    @classmethod
    def setUpTestData(cls):
        cls.users = [
            User.objects.create_user(username=f"cap_{i}", email=f"cap_{i}@bench.local", password="x")
            for i in range(80)
        ]

    def _run_burst(self, label: str, worker_fn, pool_size: int) -> BurstResult:
        stop_at = time.perf_counter() + self.burst_seconds
        lock = threading.Lock()
        success = errors = attempts = 0
        counter = {"i": 0}

        def worker():
            nonlocal success, errors, attempts
            close_old_connections()
            client = APIClient()
            while time.perf_counter() < stop_at:
                with lock:
                    idx = counter["i"]
                    counter["i"] += 1
                attempts += 1
                try:
                    if worker_fn(client, idx):
                        success += 1
                    else:
                        errors += 1
                except Exception:
                    errors += 1

        t0 = time.perf_counter()
        with ThreadPoolExecutor(max_workers=pool_size) as ex:
            futs = [ex.submit(worker) for _ in range(pool_size)]
            for f in as_completed(futs):
                f.result()
        duration = time.perf_counter() - t0
        result = BurstResult(label, duration, attempts, success, errors)
        print(f"\n  {result.report()}")
        return result

    def test_users_requests_per_second(self):
        """Utilisateurs actifs : requêtes API authentifiées /api/games/bots/."""

        def hit(client: APIClient, idx: int) -> bool:
            client.force_authenticate(user=self.users[idx % len(self.users)])
            resp = client.get("/api/games/bots/")
            return resp.status_code == 200

        result = self._run_burst("Utilisateurs (req API auth/s)", hit, pool_size=60)
        self.assertGreater(result.success, 0)
        self.assertGreater(result.per_second, 10, result.report())

    @patch("apps.games.services.ChessEngineService")
    def test_simultaneous_games_started_per_second(self, mock_engine_cls):
        """Joueurs simultanés : démarrage de parties vs IA (moteur mocké)."""
        mock_engine = MagicMock()
        mock_engine.get_best_move.return_value = EngineMove(uci="e7e5", san="e5")
        mock_engine_cls.return_value = mock_engine

        def start(client: APIClient, idx: int) -> bool:
            client.force_authenticate(user=self.users[idx % len(self.users)])
            resp = client.post("/api/games/ai/", {"mode": "blitz", "color": "white"}, format="json")
            return resp.status_code in (200, 201)

        result = self._run_burst("Parties démarrées vs IA/s", start, pool_size=40)
        self.assertGreater(result.success, 0)
        print(f"  → Joueurs simultanés (démarrage partie) : ~{result.per_second:.0f}/s")

    @patch("apps.games.services.ChessEngineService")
    def test_simultaneous_moves_per_second(self, mock_engine_cls):
        """Coups joués en parallèle sur des parties actives."""
        mock_engine = MagicMock()
        mock_engine.get_best_move.return_value = EngineMove(uci="e7e5", san="e5")
        mock_engine.apply_move.return_value = (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "e4",
            False,
        )
        mock_engine.analyze_position.return_value = 0.0
        mock_engine_cls.return_value = mock_engine

        svc = GameService()
        games = []
        for u in self.users[:30]:
            g = svc.create_ai_game(u, mode="blitz", color="white", ai_elo=800)
            games.append(g)

        def play(client: APIClient, idx: int) -> bool:
            user = self.users[idx % len(games)]
            client.force_authenticate(user=user)
            game = games[idx % len(games)]
            resp = client.post(f"/api/games/{game.id}/move/", {"uci": "e2e4"}, format="json")
            return resp.status_code == 200

        result = self._run_burst("Coups joués/s", play, pool_size=40)
        self.assertGreater(result.success, 0)
        print(f"  → Actions de jeu : ~{result.per_second:.0f} coups/s")

    def test_capacity_summary(self):
        """Affiche le résumé — voir stdout des tests précédents."""
        print("\n" + "=" * 62)
        print("  CAPACITÉ 1s — voir chiffres ci-dessus")
        print("  HTTP réel : python3 scripts/benchmark_1s.py")
        print("=" * 62)


@override_settings(REST_FRAMEWORK=_NO_THROTTLE)
class InProcessServiceCapacityTests(TestCase):
    """Plafond in-process (service Django, sans HTTP)."""

    @patch("apps.games.services.ChessEngineService")
    def test_inprocess_ai_games_per_second(self, mock_engine_cls):
        mock_engine_cls.return_value.get_best_move.return_value = None
        user = User.objects.create_user(username="ipc_ai", password="x")
        svc = GameService()

        t0 = time.perf_counter()
        deadline = t0 + 1.0
        count = 0
        while time.perf_counter() < deadline:
            svc.create_ai_game(user, mode="blitz", color="white", ai_elo=800)
            count += 1
        duration = time.perf_counter() - t0
        rate = count / duration
        print(f"\n  Parties IA (service seul) : {count} en {duration:.3f}s → {rate:.1f}/s")
        self.assertGreater(count, 20)
