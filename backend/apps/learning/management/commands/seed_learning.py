from django.core.management.base import BaseCommand

from apps.learning.models import Badge, Course, Lesson, Quiz


class Command(BaseCommand):
    help = "Cours, leçons, quiz et badges de démonstration."

    def handle(self, *args, **options):
        badges = [
            ("puzzle_10", "Tacticien", "10 puzzles résolus", "🧩", 20),
            ("xp_500", "Apprenant", "500 XP atteints", "📚", 0),
            ("xp_1400", "Stratège", "1400 XP atteints", "♟️", 0),
            ("xp_master", "Maître AFRICHESS", "5000 XP", "👑", 0),
            ("course_first", "Premier cours", "Terminer un cours", "🎓", 30),
        ]
        for code, name, desc, icon, xp in badges:
            Badge.objects.get_or_create(
                code=code,
                defaults={"name": name, "description": desc, "icon": icon, "xp_reward": xp},
            )

        course, _ = Course.objects.get_or_create(
            slug="fondamentaux-echecs",
            defaults={
                "title": "Fondamentaux des échecs",
                "level": Course.Level.BEGINNER,
                "description": "Découvrez les règles, la valeur des pièces et les principes de base.",
                "order": 1,
                "xp_reward": 100,
            },
        )
        lessons_data = [
            (
                1,
                "Le plateau et les pièces",
                "L'échiquier compte 64 cases. Chaque pièce a un mouvement unique : "
                "le pion avance d'une case (deux au premier coup), la tour en ligne droite, "
                "le fou en diagonale, le cavalier en « L », la dame combine tour et fou, "
                "le roi d'une case dans toutes les directions.",
                "",
            ),
            (
                2,
                "Échec, mat et pat",
                "Si le roi est attaqué, c'est l'échec. Il faut parer. "
                "Mat = roi attaqué sans échappatoire. Pat = roi non en échec mais aucun coup légal : nulle.",
                "",
            ),
            (
                3,
                "Ouvertures : les trois règles",
                "1) Contrôler le centre (e4, d4). 2) Développer les pièces mineures. "
                "3) Roquer tôt pour mettre le roi en sécurité.",
                "",
            ),
        ]
        for order, title, content, video in lessons_data:
            Lesson.objects.get_or_create(
                course=course,
                order=order,
                defaults={"title": title, "content": content, "video_url": video},
            )

        Quiz.objects.get_or_create(
            course=course,
            lesson=None,
            defaults={
                "title": "Quiz — Fondamentaux",
                "questions": [
                    {
                        "question": "Combien de cases a un échiquier ?",
                        "options": ["32", "64", "81"],
                        "correct_index": 1,
                    },
                    {
                        "question": "Que signifie « roquer » ?",
                        "options": [
                            "Déplacer roi et tour en une fois",
                            "Promouvoir un pion",
                            "Capturer en passant",
                        ],
                        "correct_index": 0,
                    },
                    {
                        "question": "Quelle pièce combine tour et fou ?",
                        "options": ["Cavalier", "Dame", "Fou"],
                        "correct_index": 1,
                    },
                ],
                "passing_score": 66,
            },
        )

        course2, _ = Course.objects.get_or_create(
            slug="tactiques-essentielles",
            defaults={
                "title": "Tactiques essentielles",
                "level": Course.Level.INTERMEDIATE,
                "description": "Fourchettes, clouages et mat en quelques coups.",
                "order": 2,
                "xp_reward": 150,
            },
        )
        Lesson.objects.get_or_create(
            course=course2,
            order=1,
            defaults={
                "title": "La fourchette",
                "content": "Une pièce attaque deux adversaires à la fois. "
                "Le cavalier est roi de la fourchette.",
                "video_url": "",
            },
        )

        self.stdout.write(self.style.SUCCESS("Contenu d'apprentissage initialisé."))
