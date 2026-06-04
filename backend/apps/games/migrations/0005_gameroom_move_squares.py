import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0004_move_comment"),
    ]

    operations = [
        migrations.CreateModel(
            name="GameRoom",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("room_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("white_connected", models.BooleanField(default=False)),
                ("black_connected", models.BooleanField(default=False)),
                ("last_activity", models.DateTimeField(auto_now=True)),
                (
                    "game",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room",
                        to="games.game",
                    ),
                ),
            ],
            options={
                "verbose_name": "Salle de jeu",
                "verbose_name_plural": "Salles de jeu",
            },
        ),
        migrations.AddField(
            model_name="move",
            name="from_square",
            field=models.CharField(blank=True, help_text="Case départ (ex. e2)", max_length=2),
        ),
        migrations.AddField(
            model_name="move",
            name="to_square",
            field=models.CharField(blank=True, help_text="Case arrivée (ex. e4)", max_length=2),
        ),
    ]
