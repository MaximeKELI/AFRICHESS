#!/usr/bin/env python3
"""
Benchmark 1 seconde — utilisateurs et joueurs simultanés (HTTP réel).

Usage:
  python3 scripts/benchmark_1s.py
  python3 scripts/benchmark_1s.py --base http://localhost:8000 --workers 150
"""

from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
import sys
import time

try:
    import aiohttp
except ImportError:
    print("pip install aiohttp")
    sys.exit(1)


def fetch_tokens_docker(count: int) -> list[str]:
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
        username=f'bench1s_{{i}}',
        defaults={{'email': f'bench1s_{{i}}@bench.local'}},
    )
    tokens.append(str(RefreshToken.for_user(u).access_token))
print(json.dumps(tokens))
"""
    try:
        out = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=10,
        )
        for cname in out.stdout.splitlines():
            if "backend" in cname:
                r = subprocess.run(
                    ["docker", "exec", cname, "python", "-c", script],
                    capture_output=True, text=True, timeout=120,
                )
                if r.returncode == 0 and r.stdout.strip().startswith("["):
                    return json.loads(r.stdout.strip())
    except Exception:
        pass
    return []


async def burst(
    session: aiohttp.ClientSession,
    base: str,
    method: str,
    path: str,
    tokens: list[str],
    workers: int,
    seconds: float,
    body_factory=None,
) -> tuple[int, int, float]:
    stop_at = time.perf_counter() + seconds
    success = errors = 0
    lock = asyncio.Lock()
    counter = 0

    async def worker(wid: int):
        nonlocal success, errors, counter
        token = tokens[wid % len(tokens)] if tokens else None
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        while time.perf_counter() < stop_at:
            async with lock:
                idx = counter
                counter += 1
            body = body_factory(idx) if body_factory else None
            try:
                url = f"{base}{path}"
                kwargs = {"headers": headers, "timeout": aiohttp.ClientTimeout(total=10)}
                if method == "GET":
                    async with session.get(url, **kwargs) as resp:
                        await resp.read()
                        ok = 200 <= resp.status < 400
                else:
                    async with session.post(url, json=body, **kwargs) as resp:
                        await resp.read()
                        ok = 200 <= resp.status < 400
                if ok:
                    success += 1
                else:
                    errors += 1
            except Exception:
                errors += 1

    t0 = time.perf_counter()
    await asyncio.gather(*[worker(i) for i in range(workers)])
    duration = time.perf_counter() - t0
    return success, errors, duration


async def main():
    parser = argparse.ArgumentParser(description="Benchmark AFRICHESS — 1 seconde")
    parser.add_argument("--base", default="http://localhost:8000")
    parser.add_argument("--workers", type=int, default=100)
    parser.add_argument("--seconds", type=float, default=1.0)
    args = parser.parse_args()

    print(f"AFRICHESS — benchmark {args.seconds}s → {args.base}")
    tokens = fetch_tokens_docker(args.workers)
    if not tokens:
        print("⚠ Pas de JWT Docker — lancez docker compose up -d backend")
        sys.exit(1)
    print(f"  {len(tokens)} tokens JWT\n")

    connector = aiohttp.TCPConnector(limit=args.workers + 20)
    async with aiohttp.ClientSession(connector=connector) as session:
        # 1) Utilisateurs actifs (navigation API)
        ok, err, dur = await burst(
            session, args.base, "GET", "/api/games/bots/", tokens, args.workers, args.seconds
        )
        users_per_s = ok / dur
        print(f"👤 Utilisateurs (req API auth/s) : {ok} OK, {err} err → {users_per_s:.1f}/s")

        # 2) Parties démarrées vs IA
        ok2, err2, dur2 = await burst(
            session,
            args.base,
            "POST",
            "/api/games/ai/",
            tokens,
            min(args.workers, 60),
            args.seconds,
            body_factory=lambda _i: {"mode": "blitz", "color": "white"},
        )
        games_per_s = ok2 / dur2
        print(f"♟️  Parties démarrées vs IA/s    : {ok2} OK, {err2} err → {games_per_s:.1f}/s")

    print("\n" + "═" * 50)
    print(f"  EN 1 SECONDE (backend actuel, {args.workers} workers)")
    print(f"  · ~{users_per_s:.0f} requêtes utilisateur/s")
    print(f"  · ~{games_per_s:.0f} parties simultanées démarrées/s")
    print(f"  · Joueurs actifs estimés (1 req/5s + 1 partie) : ~{min(users_per_s * 5, games_per_s * 10):.0f}")
    print("═" * 50)
    print("\nNote : Docker local 1 processus Daphne — production nécessite scaling horizontal.")


if __name__ == "__main__":
    asyncio.run(main())
