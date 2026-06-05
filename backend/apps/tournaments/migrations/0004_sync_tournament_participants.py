from django.db import migrations


def sync_m2m_to_standings(apps, schema_editor):
    Tournament = apps.get_model("tournaments", "Tournament")
    TournamentParticipant = apps.get_model("tournaments", "TournamentParticipant")
    for tournament in Tournament.objects.all():
        for user in tournament.participants.all():
            TournamentParticipant.objects.get_or_create(
                tournament=tournament,
                user=user,
                defaults={
                    "score": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "games_played": 0,
                },
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("tournaments", "0003_merge_0002_initial_0002_tournamentparticipant"),
    ]

    operations = [
        migrations.RunPython(sync_m2m_to_standings, noop_reverse),
    ]
