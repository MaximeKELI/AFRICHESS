import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0004_forumpostlike"),
        ("tournaments", "0005_tournament_rounds"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClubEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("event_type", models.CharField(choices=[("announcement", "Announcement"), ("tournament", "Tournament"), ("challenge", "Challenge")], default="announcement", max_length=20)),
                ("starts_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("club", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="social.club")),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="club_events_created", to=settings.AUTH_USER_MODEL)),
                ("tournament", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="club_events", to="tournaments.tournament")),
            ],
            options={"ordering": ["starts_at"]},
        ),
    ]
