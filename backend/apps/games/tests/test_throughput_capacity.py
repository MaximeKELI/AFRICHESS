"""
Test de capacité — combien d'utilisateurs et de joueurs simultanés
la plateforme encaisse en 1 seconde.

Exécution :
  docker compose exec backend python manage.py test apps.games.tests.test_throughput_capacity -v 2

  # ou avec le script HTTP (backend déjà lancé) :
  python3 scripts/benchmark_1s.py
"""

from __future__ import annotations

import json
import statistics
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import LiveServerTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.games.engine import EngineMove
from apps.games.models import Game
from apps.games.services import GameService

User = get_user_model()

# Désactive le throttle pour mesurer la capacité brute du serveur
_NO_THROTTLE = {
    **settings.REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
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


def _http_json(method: str, url: str, token: str | None = None, body: dict | None = None, timeout: float = 5.0):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            ms = (time.perf_counter() - t0) * 1000
            return resp.status, json.loads(raw.decode()) if raw else {}, ms, None
    except urllib.error.HTTPError as e:
        ms = (time.perf_counter() - t0) * 1000
        try:
            err_body = e.read().decode()
        except Exception:
            err_body = ""
        return e.code, {}, ms, err_body
    except Exception as exc:
        ms = (time.perf_counter() - t0) * 1000
        return 0, {}, ms, str(exc)


@override_settings(REST_FRAMEWORK=_NO_THROTTLE)
class ThroughputCapacityTests(LiveServerTestCase):
    """Mesure le débit sur une fenêtre de 1 seconde (HTTP réel via LiveServer)."""

    burst_seconds = 1.0
    max_workers = 200

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.users: list[User] = []
        cls.tokens: list[str] = []
        for i in range(300):
            u = User.objects.create_user(
                username=f"cap_{i}_{int(time.time())}",
                email=f"cap_{i}@bench.local",
                password="CapTestPass123!",
            )
            cls.users.append(u)
            cls.tokens.append(str(RefreshToken.for_user(u).access_token))

    def _run_burst(self, label: str, worker_fn, pool_size: int) -> BurstResult:
        """Lance worker_fn() en boucle pendant burst_seconds."""
        stop_at = time.perf_counter() + self.burst_seconds
        lock = threading.Lock()
        success = errors = attempts = 0
        counter = {"i": 0}

        def worker():
            nonlocal success, errors, attempts
            while time.perf_counter() < stop_at:
                with lock:
                    idx = counter["i"]
                    counter["i"] += 1
                attempts += 1
                try:
                    if worker_fn(idx):
                        success += 1
                    else:
                        errors += 1
                except Exception:
                    errors += 1

        t0 = time.perf_counter()
        with ThreadPoolExecutor(max_workers=min(pool_size, self.max_workers)) as ex:
            futs = [ex.submit(worker) for _ in range(pool_size)]
            for f in as_completed(futs):
                f.result()
        duration = time.perf_counter() - t0
        result = BurstResult(label, duration, attempts, success, errors)
        print(f"\n  {result.report()}")
        return result

    def test_users_requests_per_second(self):
        """Utilisateurs actifs simulés : requêtes API authentifiées /api/games/bots/."""
        base = self.live_server_url

        def hit(_idx: int) -> bool:
            token = self.tokens[_idx % len(self.tokens)]
            status, _, _, _ = _http_json("GET", f"{base}/api/games/bots/", token=token)
            return 200 <= status < 400

        result = self._run_burst("Utilisateurs (req API auth/s)", hit, pool_size=100)
        self.assertGreater(result.success, 0, "Aucune requête utilisateur réussie")
        # Seuil soft — échoue seulement si catastrophique (< 5 req/s en local)
        self.assertGreater(result.per_second, 5, result.report())

    @patch("apps.games.services.ChessEngineService")
    def test_simultaneous_games_started_per_second(self, mock_engine_cls):
        """Joueurs simultanés : démarrage de parties vs IA (moteur mocké)."""
        mock_engine = MagicMock()
        mock_engine.get_best_move.return_value = EngineMove(uci="e7e5", san="e5")
        mock_engine.apply_move.return_value = (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "e4",
            False,
        )
        mock_engine.analyze_position.return_value = 0.0
        mock_engine_cls.return_value = mock_engine

        base = self.live_server_url

        def start_game(idx: int) -> bool:
            token = self.tokens[idx % len(self.tokens)]
            status, data, _, _ = _http_json(
                "POST",
                f"{base}/api/games/ai/",
                token=token,
                body={"mode": "blitz", "color": "white"},
            )
            return 200 <= status < 400 and bool(data.get("id"))

        result = self._run_burst("Parties démarrées vs IA/s", start_game, pool_size=80)
        self.assertGreater(result.success, 0, "Aucune partie démarrée")
        print(f"  → Capacité estimée joueurs simultanés (démarrage) : ~{result.per_second:.0f}/s")

    @patch("apps.games.services.ChessEngineService")
    def test_simultaneous_moves_per_second(self, mock_engine_cls):
        """Coups joués en parallèle sur des parties actives (charge jeu réel)."""
        mock_engine = MagicMock()
        mock_engine.get_best_move.return_value = EngineMove(uci="e7e5", san="e5")
        mock_engine.apply_move.side_effect = lambda fen, uci, **kw: (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
            if uci == "e2e4"
            else ("rnbqkbnr/pppppppp/8/8/4P3/4p3/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "e5", False)
        )
        mock_engine.analyze_position.return_value = 0.0
        mock_engine_cls.return_value = mock_engine

        svc = GameService()
        games: list[str] = []
        for u in self.users[:60]:
            g = svc.create_ai_game(u, mode="blitz", color="white", ai_elo=800)
            games.append(str(g.id))

        base = self.live_server_url

        def play_move(idx: int) -> bool:
            user = self.users[idx % len(games)]
            token = str(RefreshToken.for_user(user).access_token)
            game_id = games[idx % len(games)]
            status, _, _, _ = _http_json(
                "POST",
                f"{base}/api/games/{game_id}/move/",
                token=token,
                body={"uci": "e2e4"},
            )
            return 200 <= status < 400

        result = self._run_burst("Coups joués/s (parties actives)", play_move, pool_size=80)
        self.assertGreater(result.success, 0, "Aucun coup joué")
        print(f"  → Capacité estimée actions de jeu : ~{result.per_second:.0f} coups/s")

    def test_capacity_summary_report(self):
        """Rapport synthétique affiché en fin de suite."""
        print("\n" + "=" * 62)
        print("  RÉSUMÉ CAPACITÉ AFRICHESS (fenêtre 1 seconde, LiveServer)")
        print("  Lancez aussi : python3 scripts/benchmark_1s.py")
        print("  pour mesurer le backend Docker en conditions réelles.")
        print("=" * 62)


@override_settings(REST_FRAMEWORK=_NO_THROTTLE)
class InProcessServiceCapacityTests(LiveServerTestCase):
    """Benchmark in-process (sans HTTP) — plafond théorique du code Django."""

    def test_inprocess_users_created_per_second(self):
        t0 = time.perf_counter()
        deadline = t0 + 1.0
        count = 0
        i = 0
        while time.perf_counter() < deadline:
            User.objects.create_user(
                username=f"ipc_{int(time.time()*1000)}_{i}",
                email=f"ipc_{i}@local.test",
                password="x",
            )
            count += 1
            i += 1
        duration = time.perf_counter() - t0
        rate = count / duration
        print(f"\n  Création utilisateurs ORM : {count} en {duration:.3f}s → {rate:.1f}/s")
        self.assertGreater(count, 10)

    @patch("apps.games.services.ChessEngineService")
    def test_inprocess_ai_games_per_second(self, mock_engine_cls):
        mock_engine = MagicMock()
        mock_engine.get_best_move.return_value = None
        mock_engine_cls.return_value = mock_engine
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
        print(f"\n  Parties IA (service, moteur mock) : {count} en {duration:.3f}s → {rate:.1f}/s")
        self.assertGreater(count, 5)
