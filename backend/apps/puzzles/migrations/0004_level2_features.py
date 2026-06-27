import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("puzzles", "0003_db_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="puzzle",
            name="author",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="custom_puzzles", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="puzzle",
            name="is_public",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="puzzle",
            name="source",
            field=models.CharField(default="seed", max_length=20),
        ),
        migrations.CreateModel(
            name="PuzzleRushSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("puzzle_ids", models.JSONField(default=list)),
                ("current_index", models.PositiveSmallIntegerField(default=0)),
                ("score", models.PositiveSmallIntegerField(default=0)),
                ("misses", models.PositiveSmallIntegerField(default=0)),
                ("status", models.CharField(choices=[("active", "Active"), ("completed", "Completed")], default="active", max_length=20)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("ends_at", models.DateTimeField()),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="PuzzleBattle",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("puzzle_ids", models.JSONField(default=list)),
                ("current_index", models.PositiveSmallIntegerField(default=0)),
                ("score1", models.PositiveSmallIntegerField(default=0)),
                ("score2", models.PositiveSmallIntegerField(default=0)),
                ("status", models.CharField(choices=[("waiting", "Waiting"), ("active", "Active"), ("completed", "Completed")], default="waiting", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("player1", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="battles_as_p1", to=settings.AUTH_USER_MODEL)),
                ("player2", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="battles_as_p2", to=settings.AUTH_USER_MODEL)),
                ("winner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="battles_won", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="PuzzleBattleQueue",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
