# Generated manually — only add is_tv_exhibition

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0036_gamechallenge_lobby_seek"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="is_tv_exhibition",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Partie exhibition IA vs IA pour AFRICHESS TV (vraie partie Stockfish)",
            ),
        ),
    ]
