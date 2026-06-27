from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tournaments", "0004_sync_tournament_participants"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="current_round",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="tournament",
            name="total_rounds",
            field=models.PositiveSmallIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="tournamentparticipant",
            name="is_available",
            field=models.BooleanField(
                default=True,
                help_text="Arène : disponible pour un nouveau pairing",
            ),
        ),
    ]
