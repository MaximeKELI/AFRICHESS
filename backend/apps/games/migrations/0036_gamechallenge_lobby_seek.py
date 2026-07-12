# Generated manually for lobby open seeks

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0035_game_tournament_league_flags"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gamechallenge",
            name="opponent",
            field=models.ForeignKey(
                blank=True,
                help_text="Null = seek lobby ouvert (n'importe qui peut accepter)",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="challenges_received",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name="gamechallenge",
            index=models.Index(
                fields=["status", "opponent"],
                name="games_gamec_status_opp_idx",
            ),
        ),
    ]
