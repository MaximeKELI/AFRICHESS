from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0012_alter_game_variant"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="is_rated",
            field=models.BooleanField(
                default=True,
                help_text="False = partie amicale sans impact Elo",
            ),
        ),
        migrations.AddField(
            model_name="matchmakingqueue",
            name="is_rated",
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name="CorrespondenceQueue",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("days_per_move", models.PositiveSmallIntegerField(default=3)),
                ("elo", models.PositiveIntegerField(default=1200)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["days_per_move", "elo"],
                        name="games_corre_days_elo_idx",
                    )
                ],
            },
        ),
    ]
