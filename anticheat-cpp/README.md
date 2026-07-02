# Fair Play engine (C++)

Post-game engine correlation analysis for rated human games. Complements the Python realtime checks in `backend/apps/games/anticheat.py`.

Also ships a **native board kernel** (`libafrichess_native.so`) used in-process from Django via ctypes for standard chess move validation and complexity heuristics.

## Build

```bash
cd anticheat-cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
# → build/africhess-fairplay
# → build/libafrichess_native.so
```

Requirements: CMake, C++17 compiler, Stockfish on PATH (or set when running).  
`chess.hpp` (Disservin/chess-library) is downloaded automatically at configure time.

## Artifacts

| Output | Role |
|--------|------|
| `africhess-fairplay` | CLI binary (JSON stdin/stdout), subprocess fallback |
| `libafrichess_native.so` | Shared library: `africhess_standard_move`, `africhess_complexity_cp`, `africhess_fairplay_analyze` |

C API headers: `include/fairplay/board_api.h`, `include/fairplay/fairplay_api.h`.

Python wrappers: `backend/apps/games/board_native.py` (ctypes), `board_fast.py` (native + unified Python fallback).

## Docker / CI

- **Dockerfile** (`backend/Dockerfile`): binary + shared lib installed under `/usr/local/{bin,lib}`, `ldconfig`
- **docker-compose**: volume mount `./anticheat-cpp` for local rebuilds
- **CI** (`.github/workflows/ci.yml`): builds both artifacts into `backend/bin/`

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `FAIRPLAY_BIN` | `/usr/local/bin/africhess-fairplay` | Path to CLI binary (subprocess fallback) |
| `AFRICHESS_NATIVE_LIB` | *(auto-detect)* | Optional explicit path to `libafrichess_native.so` |
| `FAIRPLAY_DEPTH` | `14` | Stockfish depth for post-game analysis |
| `FAIRPLAY_TIMEOUT` | `120` | Subprocess timeout (seconds) |

## Protocol

**CLI** — stdin: JSON with game moves and metadata. stdout: JSON with correlation scores and signals.

**In-process** — `africhess_fairplay_analyze(json_in, buf, size)` avoids fork overhead when the `.so` is loaded.

Orchestration: `backend/apps/games/fairplay_service.py` (in-process first, then subprocess).  
Move hot path (standard variant): `board_fast.try_standard_move()` — complexity + apply in one board parse.

Scheduled after rated PvP completion via Celery (`analyze_fairplay_async`).

## Two-layer model

1. **Realtime (Python)** — move rate, timing, tab/focus telemetry → may block moves during play
2. **Post-game (C++)** — engine top-move correlation → staff review queue, no auto-ban

See `docs/DEPLOYMENT.md` for production checklist.
