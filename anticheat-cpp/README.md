# Fair Play engine (C++)

Post-game engine correlation analysis for rated human games. Complements the Python realtime checks in `backend/apps/games/anticheat.py`.

## Build

```bash
cd anticheat-cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
# → build/africhess-fairplay
```

Requirements: CMake, C++17 compiler, Stockfish on PATH (or set when running).

## Docker / CI

- **Dockerfile** (`backend/Dockerfile`): binary installed at `/usr/local/bin/africhess-fairplay`
- **docker-compose**: volume mount `./anticheat-cpp` for local rebuilds
- **CI** (`.github/workflows/ci.yml`): builds and sets `FAIRPLAY_BIN`

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `FAIRPLAY_BIN` | `/usr/local/bin/africhess-fairplay` | Path to binary |
| `FAIRPLAY_DEPTH` | `12` | Stockfish depth for post-game analysis |
| `FAIRPLAY_TIMEOUT` | `120` | Subprocess timeout (seconds) |

## Protocol

Stdin: JSON with game moves and metadata.  
Stdout: JSON with correlation scores and signals.

Orchestration: `backend/apps/games/fairplay_service.py` (subprocess).  
Scheduled after rated PvP completion via Celery (`analyze_fairplay_async`).

## Two-layer model

1. **Realtime (Python)** — move rate, timing, tab/focus telemetry → may block moves during play
2. **Post-game (C++)** — engine top-move correlation → staff review queue, no auto-ban

See `docs/DEPLOYMENT.md` for production checklist.
