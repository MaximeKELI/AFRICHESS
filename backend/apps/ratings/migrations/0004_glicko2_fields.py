# Generated migration — Glicko-2 fields on PlayerRating

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ratings", "0003_leagueseason_leaguestanding"),
    ]

    operations = [
        migrations.AddField(
            model_name="playerrating",
            name="rd",
            field=models.FloatField(default=350.0),
        ),
        migrations.AddField(
            model_name="playerrating",
            name="volatility",
            field=models.FloatField(default=0.06),
        ),
    ]
