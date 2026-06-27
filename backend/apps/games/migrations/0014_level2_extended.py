# Generated manually — Level 2 features

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0013_game_is_rated_queue"),
        ("social", "0004_forumpostlike"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="is_vote_chess",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="game",
            name="odds_preset",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.CreateModel(
            name="SimulSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(blank=True, max_length=120)),
                ("status", models.CharField(choices=[("open", "Open"), ("active", "Active"), ("completed", "Completed")], default="open", max_length=20)),
                ("max_boards", models.PositiveSmallIntegerField(default=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("host", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="simuls_hosted", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="VoteGame",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("voting_ply", models.PositiveSmallIntegerField(default=0)),
                ("club_black", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="vote_games_black", to="social.club")),
                ("club_white", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="vote_games_white", to="social.club")),
                ("game", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="vote_meta", to="games.game")),
            ],
        ),
        migrations.CreateModel(
            name="SimulBoard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("board_number", models.PositiveSmallIntegerField(default=1)),
                ("game", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="simul_board", to="games.game")),
                ("opponent", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="simul_games", to=settings.AUTH_USER_MODEL)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="boards", to="games.simulsession")),
            ],
            options={"unique_together": {("session", "opponent")}},
        ),
        migrations.CreateModel(
            name="GameVote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("move_uci", models.CharField(max_length=10)),
                ("ply", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("game", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="votes", to="games.game")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("game", "user", "ply")}},
        ),
    ]
