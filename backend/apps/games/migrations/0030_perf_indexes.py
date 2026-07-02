from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0029_game_repetition_counts"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="game",
            index=models.Index(
                fields=["white_player", "-ended_at"],
                name="games_white_ended_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="game",
            index=models.Index(
                fields=["black_player", "-ended_at"],
                name="games_black_ended_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="game",
            index=models.Index(
                fields=["mode", "status", "turn_deadline"],
                name="games_corr_forfeit_idx",
            ),
        ),
    ]
