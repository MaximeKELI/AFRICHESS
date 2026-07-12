from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tournaments", "0007_team_battle_format"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="is_rated",
            field=models.BooleanField(
                default=True,
                help_text="Parties du tournoi classées Elo (défaut Lichess)",
            ),
        ),
    ]
