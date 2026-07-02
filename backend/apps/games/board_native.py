"""Noyau C++ natif — coups standard + fair play in-process (ctypes)."""

from __future__ import annotations

import ctypes
import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_lib: ctypes.CDLL | None = None
_lib_tried = False


class _MoveResult(ctypes.Structure):
    _fields_ = [
        ("fen", ctypes.c_char * 100),
        ("san", ctypes.c_char * 16),
        ("complexity_cp", ctypes.c_int32),
        ("game_over", ctypes.c_int32),
        ("ok", ctypes.c_int32),
    ]


def _library_paths() -> list[str]:
    from django.conf import settings

    roots = [
        getattr(settings, "AFRICHESS_NATIVE_LIB", ""),
        "/usr/local/lib/libafrichess_native.so",
        "/usr/local/lib/libafrichess_native.so.1",
        str(Path(__file__).resolve().parents[2] / "bin/libafrichess_native.so"),
        "/anticheat-cpp/build/libafrichess_native.so",
        "/anticheat-cpp/build/libafrichess_native.so.1",
    ]
    return [p for p in roots if p and os.path.isfile(p)]


def native_available() -> bool:
    return _load_library() is not None


def _load_library() -> ctypes.CDLL | None:
    global _lib, _lib_tried
    if _lib_tried:
        return _lib
    _lib_tried = True
    for path in _library_paths():
        try:
            lib = ctypes.CDLL(path)
            lib.africhess_standard_move.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
                ctypes.POINTER(_MoveResult),
            ]
            lib.africhess_standard_move.restype = ctypes.c_int
            lib.africhess_complexity_cp.argtypes = [ctypes.c_char_p]
            lib.africhess_complexity_cp.restype = ctypes.c_int
            lib.africhess_fairplay_analyze.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
                ctypes.c_size_t,
            ]
            lib.africhess_fairplay_analyze.restype = ctypes.c_int
            _lib = lib
            logger.info("Loaded native library: %s", path)
            return lib
        except OSError as exc:
            logger.debug("Native lib not loadable at %s: %s", path, exc)
    return None


def try_standard_move(
    fen: str,
    uci: str,
    *,
    with_complexity: bool = True,
) -> dict[str, Any] | None:
    """Coup standard via C++ ; None si lib absente (fallback Python)."""
    lib = _load_library()
    if lib is None:
        return None
    out = _MoveResult()
    ok = lib.africhess_standard_move(
        fen.encode("utf-8"),
        uci.encode("utf-8"),
        ctypes.byref(out),
    )
    if not ok or not out.ok:
        return {"ok": False}
    result: dict[str, Any] = {
        "ok": True,
        "fen": out.fen.decode("utf-8"),
        "san": out.san.decode("utf-8"),
        "game_over": bool(out.game_over),
    }
    if with_complexity:
        result["complexity_pre"] = int(out.complexity_cp)
    return result


def complexity_cp_native(fen: str) -> int | None:
    lib = _load_library()
    if lib is None:
        return None
    return int(lib.africhess_complexity_cp(fen.encode("utf-8")))


def fairplay_analyze_inprocess(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Analyse fair play sans fork subprocess."""
    lib = _load_library()
    if lib is None:
        return None
    raw_in = json.dumps(payload).encode("utf-8")
    buf = ctypes.create_string_buffer(512 * 1024)
    rc = lib.africhess_fairplay_analyze(raw_in, buf, len(buf))
    if rc != 0:
        logger.warning("africhess_fairplay_analyze rc=%s", rc)
        return None
    try:
        return json.loads(buf.value.decode("utf-8"))
    except json.JSONDecodeError:
        return None
