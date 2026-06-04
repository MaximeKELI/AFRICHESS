import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0005_gameroom_move_squares"),
        ("tournaments", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="turn_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="game",
            name="draw_offered_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="draw_offers_made",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="rematch_of",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rematches",
                to="games.game",
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="tournament",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="games",
                to="tournaments.tournament",
            ),
        ),
        migrations.AddField(
            model_name="gameroom",
            name="white_disconnected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gameroom",
            name="black_disconnected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
