from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0007_game_time_control"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="game",
            index=models.Index(
                fields=["tournament", "status"],
                name="games_game_tournam_6a8f2d_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="game",
            index=models.Index(
                fields=["status", "-ended_at"],
                name="games_game_status__a1b2c3_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="move",
            index=models.Index(
                fields=["game", "move_number"],
                name="games_move_game_id_4d5e6f_idx",
            ),
        ),
    ]
