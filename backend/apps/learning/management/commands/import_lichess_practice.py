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
        """Fixture hors-ligne : structure complète + quelques chapitres jouables."""
        if dry:
            self.stdout.write("dry-run seed-minimal")
            return

        # Nettoyer l'ancien démo hors catalogue
        PracticeStudy.objects.filter(lichess_id="demo0001").delete()

        demo_mates = [
            ("Queen mate", "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1", ["f7f8"]),
            ("Back rank", "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", ["a1a8"]),
            ("Rook mate", "7k/8/8/8/8/8/4R3/4K3 w - - 0 1", ["e2e8"]),
        ]
        demo_tactics = [
            ("Simple fork", "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", ["f3g5"]),
        ]

        for sec_def in PRACTICE_CATALOG:
            section, _ = PracticeSection.objects.update_or_create(
                slug=sec_def["slug"],
                defaults={"name": sec_def["name"], "order": sec_def["order"]},
            )
            for i, st in enumerate(sec_def["studies"]):
                study, _ = PracticeStudy.objects.update_or_create(
                    lichess_id=st["lichess_id"],
                    defaults={
                        "section": section,
                        "slug": st["slug"],
                        "title": st["title"],
                        "description": st.get("desc", ""),
                        "order": i,
                        "source": "seed",
                    },
                )
                # Remplir seulement le 1er study de chaque section pour le démo offline
                if i == 0 and not study.chapters.exists():
                    pack = demo_mates if sec_def["slug"] == "checkmates" else demo_tactics
                    if sec_def["slug"] not in ("checkmates", "fundamental-tactics"):
                        pack = demo_mates[:1]
                    for j, (title, fen, uci) in enumerate(pack):
                        PracticeChapter.objects.create(
                            study=study,
                            title=title,
                            order=j,
                            fen=fen,
                            pgn="",
                            solution_uci=uci,
                            goal=PracticeChapter.Goal.MATE
                            if sec_def["slug"] == "checkmates"
                            else PracticeChapter.Goal.GENERIC,
                        )

        total = PracticeChapter.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Minimal practice seed OK — {PracticeStudy.objects.count()} studies, {total} chapters"
            )
        )
