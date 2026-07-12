from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0034_game_rematch_offer"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="tournament_recorded",
            field=models.BooleanField(
                default=False,
                help_text="True une fois le score tournoi appliqué (idempotent)",
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="league_recorded",
            field=models.BooleanField(
                default=False,
                help_text="True une fois les points de ligue appliqués (idempotent)",
            ),
        ),
    ]
