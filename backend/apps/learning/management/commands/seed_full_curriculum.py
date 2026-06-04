import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.learning.curriculum.builder import write_all_markdown
from apps.learning.models import Course, Lesson, Quiz

CURRICULUM_DIR = Path(__file__).resolve().parents[2] / "curriculum"
MANIFEST = CURRICULUM_DIR / "manifest.json"
CONTENT_FR = CURRICULUM_DIR / "fr"


class Command(BaseCommand):
    help = (
        "Génère 40 documents pédagogiques (~20 pages chacun) et les charge "
        "comme cours/leçons AFRICHESS."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--regenerate",
            action="store_true",
            help="Regénère les fichiers markdown depuis builder.py",
        )
        parser.add_argument(
            "--only-generate",
            action="store_true",
            help="Génère les .md sans importer en base",
        )

    def handle(self, *args, **options):
        if options["regenerate"] or not CONTENT_FR.exists() or not any(CONTENT_FR.glob("*.md")):
            self.stdout.write("Génération des 40 documents markdown…")
            stats = write_all_markdown(CONTENT_FR)
            total = sum(stats.values())
            self.stdout.write(
                self.style.SUCCESS(
                    f"{len(stats)} fichiers — {total} mots total "
                    f"(moy. {total // max(len(stats), 1)} mots/doc)"
                )
            )

        if options["only_generate"]:
            return

        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        created_courses = 0
        created_lessons = 0

        for course_data in manifest["courses"]:
            course, created = Course.objects.update_or_create(
                slug=course_data["slug"],
                defaults={
                    "title": course_data["title"],
                    "level": course_data["level"],
                    "description": course_data["description"],
                    "order": course_data["order"],
                    "xp_reward": course_data.get("xp_reward", 120),
                    "is_published": True,
                },
            )
            if created:
                created_courses += 1

            for les in course_data["lessons"]:
                path = CONTENT_FR / les["file"]
                if not path.exists():
                    self.stderr.write(f"Fichier manquant : {path}")
                    continue
                content = path.read_text(encoding="utf-8")
                word_count = len(content.split())
                _, l_created = Lesson.objects.update_or_create(
                    course=course,
                    order=les["order"],
                    defaults={
                        "title": les["title"],
                        "content": content,
                        "video_url": "",
                        "xp_reward": les.get("xp", 25),
                    },
                )
                if l_created:
                    created_lessons += 1
                self.stdout.write(
                    f"  · {les['title'][:50]}… ({word_count} mots)"
                )

            # Quiz de fin de volume (3 questions génériques)
            Quiz.objects.get_or_create(
                course=course,
                title=f"Évaluation — {course.title}",
                defaults={
                    "questions": _quiz_for_course(course.slug),
                    "passing_score": 66,
                    "xp_reward": 40,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Curriculum chargé : {Course.objects.count()} cours, "
                f"{Lesson.objects.count()} leçons."
            )
        )


def _quiz_for_course(slug: str) -> list:
    return [
        {
            "question": f"Avez-vous lu l'ensemble des leçons du module « {slug} » ?",
            "options": ["Oui, en détail", "Partiellement", "Non"],
            "correct_index": 0,
        },
        {
            "question": "Quelle habitude AFRICHESS renforce ce volume ?",
            "options": [
                "Analyser ses parties et faire des puzzles",
                "Jouer uniquement blitz sans réflexion",
                "Mémoriser sans comprendre",
            ],
            "correct_index": 0,
        },
        {
            "question": "Que faire après avoir terminé ce volume ?",
            "options": [
                "Passer au volume suivant et appliquer en /play",
                "Abandonner l'entraînement",
                "Ignorer les exercices",
            ],
            "correct_index": 0,
        },
    ]
