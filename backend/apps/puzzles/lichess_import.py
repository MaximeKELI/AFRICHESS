"""Import puzzles depuis la base ouverte Lichess (CC0)."""

from __future__ import annotations

import csv
import io
import os
from pathlib import Path
from typing import Iterator
from urllib.request import urlopen

import chess
import zstandard

LICHESS_PUZZLE_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
DEFAULT_CACHE = Path(__file__).resolve().parents[2] / "data" / "lichess_db_puzzle.csv.zst"

RATING_TARGETS = {
    "easy": 150,
    "medium": 150,
    "hard": 150,
    "expert": 150,
}


def rating_to_difficulty(rating: int) -> str:
    if rating < 1000:
        return "easy"
    if rating < 1400:
        return "medium"
    if rating < 1800:
        return "hard"
    return "expert"


def parse_lichess_row(row: dict) -> dict | None:
    """Convertit une ligne CSV Lichess en puzzle AFRICHESS."""
    try:
        fen = (row.get("FEN") or "").strip()
        moves_raw = (row.get("Moves") or "").strip()
        if not fen or not moves_raw:
            return None

        moves = moves_raw.split()
        if len(moves) < 2:
            return None

        board = chess.Board(fen)
        setup = chess.Move.from_uci(moves[0])
        if setup not in board.legal_moves:
            return None
        board.push(setup)
        puzzle_fen = board.fen()
        solution_moves = [m.lower() for m in moves[1:]]

        for uci in solution_moves:
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                return None
            board.push(move)

        rating = int(row.get("Rating") or 1200)
        themes = (row.get("Themes") or "").split()
        if not themes:
            themes = ["tactics"]

        return {
            "fen": puzzle_fen,
            "solution_moves": solution_moves,
            "themes": themes[:8],
            "difficulty": rating_to_difficulty(rating),
            "rating": rating,
            "source": "lichess",
        }
    except Exception:
        return None


def open_lichess_csv(source: Path | str | None = None) -> Iterator[dict]:
    """Lit le CSV Lichess (fichier .zst local ou téléchargement)."""
    path = Path(source) if source else DEFAULT_CACHE
    if path.exists():
        fh = open(path, "rb")
        close_after = True
    else:
        fh = urlopen(LICHESS_PUZZLE_URL, timeout=120)
        close_after = False

    try:
        dctx = zstandard.ZstdDecompressor()
        with dctx.stream_reader(fh) as reader:
            text = io.TextIOWrapper(reader, encoding="utf-8", newline="")
            yield from csv.DictReader(text)
    finally:
        if close_after:
            fh.close()
        elif hasattr(fh, "close"):
            fh.close()


def download_lichess_db(dest: Path | None = None) -> Path:
    """Télécharge le fichier .zst Lichess vers data/."""
    dest = dest or DEFAULT_CACHE
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest

    tmp = dest.with_suffix(".zst.part")
    with urlopen(LICHESS_PUZZLE_URL, timeout=300) as resp, open(tmp, "wb") as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    os.replace(tmp, dest)
    return dest


def iter_valid_puzzles(
    source: Path | str | None = None,
    *,
    min_rating: int = 600,
    max_rating: int = 2400,
    min_popularity: int = 75,
    limit: int = 600,
) -> Iterator[dict]:
    """Parcourt le CSV et renvoie des puzzles valides, répartis par niveau."""
    counts = {k: 0 for k in RATING_TARGETS}
    seen_fens: set[str] = set()
    total = 0

    for row in open_lichess_csv(source):
        if total >= limit:
            break

        try:
            popularity = int(row.get("Popularity") or 0)
            rating = int(row.get("Rating") or 0)
        except ValueError:
            continue

        if popularity < min_popularity:
            continue
        if rating < min_rating or rating > max_rating:
            continue

        puzzle = parse_lichess_row(row)
        if not puzzle:
            continue

        diff = puzzle["difficulty"]
        if counts[diff] >= RATING_TARGETS[diff]:
            continue

        if puzzle["fen"] in seen_fens:
            continue
        seen_fens.add(puzzle["fen"])

        counts[diff] += 1
        total += 1
        yield puzzle
