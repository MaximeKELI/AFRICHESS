from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0017_fairplay"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FairPlayReviewCase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("in_review", "In review"),
                            ("dismissed", "Dismissed"),
                            ("confirmed", "Confirmed"),
                            ("escalated", "Escalated"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "decision",
                    models.CharField(
                        choices=[
                            ("none", "None"),
                            ("warn", "Warning"),
                            ("matchmaking_block", "Matchmaking block"),
                            ("suspend_temp", "Temporary suspension"),
                            ("suspend_perm", "Permanent suspension"),
                        ],
                        default="none",
                        max_length=30,
                    ),
                ),
                ("peer_score_delta", models.FloatField(default=0.0, help_text="Écart de score Fair Play vs adversaire dans la même partie")),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "report",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="review_case", to="games.fairplayreport"),
                ),
                (
                    "reviewer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="fairplay_reviews",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="FairPlaySanction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "sanction_type",
                    models.CharField(
                        choices=[
                            ("warn", "Warning"),
                            ("matchmaking_block", "Matchmaking block"),
                            ("suspend_temp", "Temporary suspension"),
                            ("suspend_perm", "Permanent suspension"),
                        ],
                        max_length=30,
                    ),
                ),
                ("until", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="fairplay_sanctions_issued",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "review_case",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sanctions", to="games.fairplayreviewcase"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="fairplay_sanctions", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="fairplayreviewcase",
            index=models.Index(fields=["status", "-created_at"], name="games_fairp_status_8a1b2c_idx"),
        ),
        migrations.AddIndex(
            model_name="fairplayreviewcase",
            index=models.Index(fields=["-peer_score_delta"], name="games_fairp_peer_sc_9d2e3f_idx"),
        ),
        migrations.AddIndex(
            model_name="fairplaysanction",
            index=models.Index(fields=["user", "is_active", "-created_at"], name="games_fairp_user_ac_4c5d6e_idx"),
        ),
    ]
