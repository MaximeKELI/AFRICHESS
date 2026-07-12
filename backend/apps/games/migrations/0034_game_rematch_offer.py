from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("games", "0033_bot_ladder_tier_victory"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="rematch_offered_by",
            field=models.ForeignKey(
                blank=True,
                help_text="Joueur ayant proposé une revanche (partie terminée)",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rematch_offers_made",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="game",
            constraint=models.UniqueConstraint(
                condition=models.Q(("rematch_of__isnull", False)),
                fields=("rematch_of",),
                name="unique_rematch_of_game",
            ),
        ),
    ]
