"""Import / export Studies — format PGN multi-chapitres (compatible Lichess)."""

from __future__ import annotations

import re
from typing import Any

CHAPTER_SPLIT = re.compile(r"\n(?=\[Event\s)", re.MULTILINE)


def export_study_pgn(study, chapters) -> str:
    """Exporte une étude en PGN multi-parties (un chapitre = une partie)."""
    blocks: list[str] = []
    for ch in chapters:
        event = ch.title.replace('"', "'")
        fen = ch.initial_fen or "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        header = (
            f'[Event "{event}"]\n'
            f'[Site "AFRICHESS Study {study.id}"]\n'
            f'[ChapterOrder "{ch.order}"]\n'
            f'[FEN "{fen}"]\n'
            f'[SetUp "1"]\n'
        )
        movetext = (ch.pgn or "").strip()
        blocks.append(f"{header}\n{movetext}\n")
    return "\n".join(blocks)


def _parse_headers(block: str) -> dict[str, str]:
    headers: dict[str, str] = {}
    for line in block.splitlines():
        if not line.startswith("["):
            break
        m = re.match(r'\[(\w+)\s+"(.*)"\]', line)
        if m:
            headers[m.group(1)] = m.group(2)
    return headers


def import_study_pgn(pgn_text: str) -> list[dict[str, Any]]:
    """
    Parse un PGN multi-parties (export Lichess / AFRICHESS) en chapitres.
    Retourne [{title, pgn, initial_fen, order}, ...].
    """
    text = (pgn_text or "").strip()
    if not text:
        return []

    parts = CHAPTER_SPLIT.split(text) if "[Event" in text else [text]
    chapters: list[dict[str, Any]] = []
    for i, part in enumerate(parts):
        part = part.strip()
        if not part:
            continue
        headers = _parse_headers(part)
        title = headers.get("Event") or f"Chapitre {i + 1}"
        fen = headers.get("FEN", "")
        order_raw = headers.get("ChapterOrder")
        order = int(order_raw) if order_raw and order_raw.isdigit() else i

        lines = part.splitlines()
        body_start = 0
        for j, line in enumerate(lines):
            if line.startswith("[") and line.endswith("]"):
                continue
            body_start = j
            break
        movetext = "\n".join(lines[body_start:]).strip()

        chapters.append(
            {
                "title": title[:200],
                "pgn": movetext,
                "initial_fen": fen[:120],
                "order": order,
            }
        )
    chapters.sort(key=lambda c: c["order"])
    return chapters
