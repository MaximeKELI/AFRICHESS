import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0005_clubevent"),
        ("tournaments", "0005_tournament_rounds"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="club_a",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tournaments_as_a", to="social.club"),
        ),
        migrations.AddField(
            model_name="tournament",
            name="club_b",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tournaments_as_b", to="social.club"),
        ),
        migrations.AddField(
            model_name="tournament",
            name="days_per_move",
            field=models.PositiveSmallIntegerField(default=3, help_text="Daily chess"),
        ),
        migrations.AddField(
            model_name="tournamentparticipant",
            name="club",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tournament_entries", to="social.club"),
        ),
        migrations.AlterField(
            model_name="tournament",
            name="format",
            field=models.CharField(
                choices=[
                    ("swiss", "Swiss"),
                    ("knockout", "Knockout"),
                    ("arena", "Arena"),
                    ("daily", "Daily"),
                    ("club_arena", "Club Arena"),
                ],
                default="swiss",
                max_length=20,
            ),
        ),
    ]
