import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tournaments", "0006_level2_daily_club"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("games", "0026_integrity_deep_review"),
    ]

    operations = [
        migrations.CreateModel(
            name="Broadcast",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=120, unique=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("live", "Live"), ("completed", "Completed")],
                        default="live",
                        max_length=20,
                    ),
                ),
                ("is_public", models.BooleanField(default=True)),
                ("synced_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="broadcasts_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tournament",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="broadcasts",
                        to="tournaments.tournament",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BroadcastBoard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("board_number", models.PositiveSmallIntegerField(default=1)),
                ("label", models.CharField(blank=True, max_length=200)),
                (
                    "broadcast",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="boards",
                        to="games.broadcast",
                    ),
                ),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="broadcast_boards",
                        to="games.game",
                    ),
                ),
            ],
            options={
                "ordering": ["board_number"],
                "unique_together": {("broadcast", "game")},
            },
        ),
    ]
