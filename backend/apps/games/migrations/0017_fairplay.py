from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0016_gameanalysis_key_moments_json_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="move",
            name="think_ms",
            field=models.PositiveIntegerField(blank=True, help_text="Temps de réflexion du joueur", null=True),
        ),
        migrations.AddField(
            model_name="move",
            name="complexity_cp",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="GameFairPlayTelemetry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("data", models.JSONField(blank=True, default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "game",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="fairplay_telemetry", to="games.game"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "indexes": [models.Index(fields=["game", "user"], name="games_gamef_game_id_6f0f8a_idx")],
                "unique_together": {("game", "user")},
            },
        ),
        migrations.CreateModel(
            name="FairPlayReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("overall_score", models.FloatField(default=0.0)),
                (
                    "verdict",
                    models.CharField(
                        choices=[
                            ("clean", "Clean"),
                            ("review", "Review"),
                            ("suspicious", "Suspicious"),
                            ("likely_cheat", "Likely cheat"),
                        ],
                        default="clean",
                        max_length=20,
                    ),
                ),
                ("signals_json", models.JSONField(blank=True, default=list)),
                ("move_evals_json", models.JSONField(blank=True, default=list)),
                ("engine_top1_rate", models.FloatField(default=0.0)),
                ("engine_top3_rate", models.FloatField(default=0.0)),
                ("avg_centipawn_loss", models.FloatField(default=0.0)),
                ("accuracy_estimate", models.FloatField(default=0.0)),
                ("analyzed_at", models.DateTimeField(auto_now=True)),
                (
                    "game",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="fairplay_reports", to="games.game"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="fairplay_reports", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "indexes": [models.Index(fields=["verdict", "-overall_score"], name="games_fairp_verdict_0d0f8a_idx")],
                "unique_together": {("game", "user")},
            },
        ),
    ]
