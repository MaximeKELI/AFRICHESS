"""Importe le catalogue Practice Lichess (études publiques → PGN API)."""

from __future__ import annotations

import time
import urllib.error
import urllib.request

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.learning.models import PracticeChapter, PracticeSection, PracticeStudy
from apps.learning.practice_catalog import PRACTICE_CATALOG
from apps.learning.practice_import import parse_practice_pgn

LICHESS_PGN = "https://lichess.org/api/study/{id}.pgn"


def fetch_study_pgn(lichess_id: str, timeout: int = 60) -> str:
    url = LICHESS_PGN.format(id=lichess_id)
    req = urllib.request.Request(url, headers={"User-Agent": "AFRICHESS-practice-import/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


class Command(BaseCommand):
    help = "Importe / met à jour le catalogue Practice depuis les études Lichess publiques."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--study", type=str, help="Un seul lichess_id")
        parser.add_argument("--sleep", type=float, default=0.4, help="Pause entre requêtes")
        parser.add_argument(
            "--seed-minimal",
            action="store_true",
            help="Sans réseau : crée sections/études vides + 1 chapitre démo",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        only = options.get("study")
        sleep = options["sleep"]
        seed_minimal = options["seed_minimal"]

        if seed_minimal:
            self._seed_minimal(dry)
            return

        total_chapters = 0
        for sec_def in PRACTICE_CATALOG:
            section, _ = PracticeSection.objects.update_or_create(
                slug=sec_def["slug"],
                defaults={"name": sec_def["name"], "order": sec_def["order"]},
            )
            for i, st in enumerate(sec_def["studies"]):
                if only and st["lichess_id"] != only:
                    continue
                self.stdout.write(f"→ {st['title']} ({st['lichess_id']})")
                if dry:
                    continue
                try:
                    pgn = fetch_study_pgn(st["lichess_id"])
                except urllib.error.HTTPError as e:
                    self.stderr.write(f"  HTTP {e.code} — skip")
                    continue
                except Exception as e:
                    self.stderr.write(f"  Error: {e}")
                    continue

                chapters = parse_practice_pgn(pgn)
                with transaction.atomic():
                    study, _ = PracticeStudy.objects.update_or_create(
                        lichess_id=st["lichess_id"],
                        defaults={
                            "section": section,
                            "slug": st["slug"],
                            "title": st["title"],
                            "description": st.get("desc", ""),
                            "order": i,
                            "source": "lichess",
                        },
                    )
                    study.chapters.all().delete()
                    for ch in chapters:
                        PracticeChapter.objects.create(
                            study=study,
                            title=ch["title"],
                            order=ch["order"],
                            fen=ch["fen"],
                            pgn=ch["pgn"],
                            solution_uci=ch["solution_uci"],
                            goal=ch["goal"],
                            goal_moves=ch["goal_moves"],
                        )
                total_chapters += len(chapters)
                self.stdout.write(f"  +{len(chapters)} chapters")
                time.sleep(sleep)

        self.stdout.write(self.style.SUCCESS(f"Done. Chapters: {total_chapters}"))

    def _seed_minimal(self, dry: bool):
        """Fixture hors-ligne pour tests / CI."""
        if dry:
            self.stdout.write("dry-run seed-minimal")
            return
        sec, _ = PracticeSection.objects.update_or_create(
            slug="checkmates",
            defaults={"name": "Checkmates", "order": 0},
        )
        study, _ = PracticeStudy.objects.update_or_create(
            lichess_id="demo0001",
            defaults={
                "section": sec,
                "slug": "piece-checkmates-i",
                "title": "Piece Checkmates I",
                "description": "Demo",
                "order": 0,
                "source": "seed",
            },
        )
        study.chapters.all().delete()
        PracticeChapter.objects.create(
            study=study,
            title="Queen mate",
            order=0,
            fen="7k/5Q2/6K1/8/8/8/8/8 w - - 0 1",
            pgn="1. Qf8#",
            solution_uci=["f7f8"],
            goal=PracticeChapter.Goal.MATE,
        )
        self.stdout.write(self.style.SUCCESS("Minimal practice seed OK"))
