#!/usr/bin/env python3
"""
Benchmark AFRICHESS — charge progressive REST + WebSocket.
Usage: python3 scripts/load_test.py [--base http://localhost:8000] [--ws]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass, field

try:
    import aiohttp
except ImportError:
    print("pip install aiohttp websockets")
    sys.exit(1)

API_PATHS = [
    ("GET", "/api/puzzles/daily/", None),
    ("GET", "/api/games/bots/", None),
    ("GET", "/api/ratings/leaderboard/global/", None),
    ("GET", "/api/learning/courses/", None),
    ("GET", "/api/puzzles/leaderboard/", None),
]


@dataclass
class LevelResult:
    concurrency: int
    total_requests: int
    success: int
    errors: int
    duration_s: float
    rps: float
    latencies_ms: list[float] = field(default_factory=list)

    @property
    def p50(self) -> float:
        return statistics.median(self.latencies_ms) if self.latencies_ms else 0

    @property
    def p95(self) -> float:
        if not self.latencies_ms:
            return 0
        s = sorted(self.latencies_ms)
        idx = int(len(s) * 0.95) - 1
        return s[max(0, idx)]

    @property
    def p99(self) -> float:
        if not self.latencies_ms:
            return 0
        s = sorted(self.latencies_ms)
        idx = int(len(s) * 0.99) - 1
        return s[max(0, idx)]

    @property
    def error_rate(self) -> float:
        return self.errors / self.total_requests * 100 if self.total_requests else 0


async def one_request(
    session: aiohttp.ClientSession,
    base: str,
    method: str,
    path: str,
    body: dict | None,
    sem: asyncio.Semaphore,
    token: str | None = None,
) -> tuple[bool, float]:
    async with sem:
        url = f"{base}{path}"
        t0 = time.perf_counter()
        try:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            kwargs = {"timeout": aiohttp.ClientTimeout(total=30), "headers": headers}
            if method == "GET":
                async with session.get(url, **kwargs) as resp:
                    await resp.read()
                    ok = 200 <= resp.status < 400
            else:
                async with session.post(url, json=body, **kwargs) as resp:
                    await resp.read()
                    ok = 200 <= resp.status < 400
            return ok, (time.perf_counter() - t0) * 1000
        except Exception:
            return False, (time.perf_counter() - t0) * 1000


async def run_rest_level(
    base: str, concurrency: int, requests_per_worker: int, tokens: list[str] | None = None
) -> LevelResult:
    sem = asyncio.Semaphore(concurrency)
    latencies: list[float] = []
    success = errors = 0
    connector = aiohttp.TCPConnector(limit=concurrency + 50, limit_per_host=concurrency + 50)
    t0 = time.perf_counter()
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = []
        for i in range(concurrency * requests_per_worker):
            method, path, body = API_PATHS[i % len(API_PATHS)]
            tok = tokens[i % len(tokens)] if tokens else None
            tasks.append(one_request(session, base, method, path, body, sem, tok))
        results = await asyncio.gather(*tasks)
    duration = time.perf_counter() - t0
    for ok, ms in results:
        latencies.append(ms)
        if ok:
            success += 1
        else:
            errors += 1
    total = len(results)
    return LevelResult(
        concurrency=concurrency,
        total_requests=total,
        success=success,
        errors=errors,
        duration_s=duration,
        rps=total / duration if duration else 0,
        latencies_ms=latencies,
    )


def fetch_tokens_docker(count: int) -> list[str]:
    """Crée des JWT via Django dans le conteneur Docker (bypass throttle REST)."""
    script = f"""
import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings.development')
django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
User = get_user_model()
tokens = []
for i in range({count}):
    u, _ = User.objects.get_or_create(
        username=f'loadbench_{{i}}',
        defaults={{'email': f'loadbench_{{i}}@bench.local'}},
    )
    tokens.append(str(RefreshToken.for_user(u).access_token))
print(json.dumps(tokens))
"""
    try:
        out = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=10,
        )
        containers = [l for l in out.stdout.splitlines() if "backend" in l]
    except Exception:
        containers = []
    for cname in containers:
        try:
            r = subprocess.run(
                ["docker", "exec", cname, "python", "-c", script],
                capture_output=True, text=True, timeout=120,
            )
            if r.returncode == 0 and r.stdout.strip().startswith("["):
                return json.loads(r.stdout.strip())
        except Exception:
            continue
    return []


async def fetch_tokens(base: str, count: int) -> list[str]:
    """Crée des comptes de test et récupère des JWT pour les tests WS."""
    tokens: list[str] = []
    async with aiohttp.ClientSession() as session:
        for i in range(count):
            user = f"loadtest_{int(time.time())}_{i}"
            email = f"{user}@loadtest.local"
            payload = {
                "username": user,
                "email": email,
                "password1": "LoadTestPass123!",
                "password2": "LoadTestPass123!",
            }
            try:
                async with session.post(
                    f"{base}/api/auth/registration/",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status in (200, 201):
                        data = await resp.json()
                        tok = data.get("access") or data.get("key")
                        if tok:
                            tokens.append(tok)
                            continue
                async with session.post(
                    f"{base}/api/auth/login/",
                    json={"username": user, "password": "LoadTestPass123!"},
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        tok = data.get("access") or data.get("key")
                        if tok:
                            tokens.append(tok)
            except Exception:
                pass
    return tokens


async def run_ws_level(
    ws_base: str, concurrency: int, tokens: list[str], hold_s: float = 2.0
) -> LevelResult:
    """Connexions WebSocket matchmaking avec JWT valides."""
    latencies: list[float] = []
    success = errors = 0
    sem = asyncio.Semaphore(concurrency)

    async def connect_one(i: int):
        nonlocal success, errors
        token = tokens[i % len(tokens)] if tokens else ""
        url = f"{ws_base}/ws/matchmaking/?token={token}"
        async with sem:
            t0 = time.perf_counter()
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.ws_connect(url, timeout=15) as ws:
                        msg = await asyncio.wait_for(ws.receive(), timeout=hold_s)
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            if data.get("event") == "connected":
                                success += 1
                            else:
                                errors += 1
                        else:
                            errors += 1
                latencies.append((time.perf_counter() - t0) * 1000)
            except Exception:
                latencies.append((time.perf_counter() - t0) * 1000)
                errors += 1

    t0 = time.perf_counter()
    await asyncio.gather(*[connect_one(i) for i in range(concurrency)])
    duration = time.perf_counter() - t0
    total = concurrency
    return LevelResult(
        concurrency=concurrency,
        total_requests=total,
        success=success,
        errors=errors,
        duration_s=duration,
        rps=total / duration if duration else 0,
        latencies_ms=latencies,
    )


def print_result(label: str, r: LevelResult):
    print(f"\n{'─' * 60}")
    print(f"  {label} — concurrence {r.concurrency}")
    print(f"  Requêtes : {r.total_requests} | OK {r.success} | Erreurs {r.errors} ({r.error_rate:.1f}%)")
    print(f"  Durée    : {r.duration_s:.2f}s | Débit : {r.rps:.0f} req/s")
    print(f"  Latence  : p50={r.p50:.0f}ms  p95={r.p95:.0f}ms  p99={r.p99:.0f}ms")


def extrapolate(results: list[LevelResult], target_users: int) -> str:
    """Estimation grossière à partir du dernier palier stable."""
    stable = [r for r in results if r.error_rate < 5 and r.p50 < 2000]
    if not stable:
        stable = results[-1:]
    best = max(stable, key=lambda x: x.rps)
    # 1 utilisateur actif ≈ 0.2 req/s (navigation) + 1 WS
    req_per_user_s = 0.2
    ws_per_user = 1
    max_rps = best.rps * 0.7  # marge 30%
    max_users_api = int(max_rps / req_per_user_s)
    max_users_ws = best.concurrency  # 1 WS par user en jeu
    realistic = min(max_users_api, max_users_ws * 50)
    return (
        f"\n{'═' * 60}\n"
        f"  EXTRAPOLATION (machine locale Docker, 1 processus Daphne)\n"
        f"  Palier stable : {best.concurrency} concurrents @ {best.rps:.0f} req/s\n"
        f"  Capacité estimée serveur actuel : ~{realistic:,} utilisateurs actifs simultanés\n"
        f"  Pour {target_users:,} utilisateurs temps réel il faudrait :\n"
        f"    · {max(1, target_users // max(realistic, 1))}× réplication backend + LB\n"
        f"    · Redis Cluster + PostgreSQL read replicas\n"
        f"    · CDN pour le frontend\n"
        f"    · Pool WebSocket dédié (pas 1 Daphne)\n"
        f"  Chess.com : milliers de serveurs — pas comparable en local.\n"
        f"  Note : throttle actuel anon=200/h, user=3000/h — à relever en prod.\n"
        f"{'═' * 60}"
    )


async def preflight(base: str, token: str | None = None) -> list[tuple[str, str, dict | None]]:
    """Ne garde que les endpoints qui répondent 2xx."""
    ok_paths: list[tuple[str, str, dict | None]] = []
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with aiohttp.ClientSession() as session:
        for method, path, body in API_PATHS:
            url = f"{base}{path}"
            try:
                async with session.get(
                    url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    status = resp.status
                    await resp.read()
                if 200 <= status < 400:
                    ok_paths.append((method, path, body))
                    print(f"  ✓ {path} → {status}")
                else:
                    print(f"  ✗ {path} → {status} (ignoré)")
            except Exception as e:
                print(f"  ✗ {path} → {e}")
    return ok_paths


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000")
    parser.add_argument("--levels", default="10,50,100,200,500")
    parser.add_argument("--per-worker", type=int, default=5)
    parser.add_argument("--ws", action="store_true")
    parser.add_argument("--target", type=int, default=1_000_000)
    args = parser.parse_args()
    levels = [int(x) for x in args.levels.split(",")]

    print(f"AFRICHESS Load Test → {args.base}")
    print("Création comptes JWT (contourne throttle anon 200/h)…")
    tokens = await fetch_tokens(args.base, max(levels))
    if not tokens:
        print("  Registration API throttled → tokens via Docker…")
        tokens = fetch_tokens_docker(max(levels))
    if not tokens:
        print("  ⚠ Pas de JWT — test anonyme (limité à 200 req/h par IP)")
    else:
        print(f"  {len(tokens)} tokens prêts")
    print("Preflight endpoints :")
    global API_PATHS
    API_PATHS = await preflight(args.base, tokens[0] if tokens else None)
    if not API_PATHS:
        print("Aucun endpoint disponible — backend down ou rate-limited ?")
        sys.exit(1)
    print(f"Paliers REST : {levels}")

    rest_results: list[LevelResult] = []
    for c in levels:
        try:
            r = await run_rest_level(args.base, c, args.per_worker, tokens or None)
            print_result("REST API", r)
            rest_results.append(r)
            if r.error_rate > 20 or r.p95 > 5000:
                print("  ⚠ Saturation détectée — paliers suivants ignorés.")
                break
            await asyncio.sleep(1)
        except Exception as e:
            print(f"  Erreur palier {c}: {e}")
            break

    if args.ws:
        ws_base = args.base.replace("http://", "ws://").replace("https://", "wss://")
        ws_levels = [l for l in levels if l <= 200]
        max_ws = max(ws_levels) if ws_levels else 50
        ws_tokens = tokens if len(tokens) >= max_ws else await fetch_tokens(args.base, max_ws)
        if len(ws_tokens) < max_ws and tokens:
            ws_tokens = tokens
        print(f"\nWebSocket : {len(ws_tokens)} tokens disponibles")
        if not ws_tokens:
            print("  ⚠ Pas de JWT — test WS ignoré")
        else:
            print(f"WebSocket matchmaking : {ws_levels}")
            for c in ws_levels:
                r = await run_ws_level(ws_base, c, ws_tokens)
                print_result("WebSocket", r)
                if r.error_rate > 30:
                    break
                await asyncio.sleep(1)

    print(extrapolate(rest_results, args.target))

    # Verdict
    last = rest_results[-1] if rest_results else None
    if last and last.error_rate < 5 and last.p50 < 500:
        print("\n✅ Architecture OK pour charge modérée (milliers d'utilisateurs avec scaling horizontal).")
    elif last and last.error_rate < 15:
        print("\n⚠ Charge moyenne tenue — optimisations requises avant production massive.")
    else:
        print("\n❌ Saturation rapide — single-node Docker insuffisant sans scaling.")


if __name__ == "__main__":
    asyncio.run(main())
