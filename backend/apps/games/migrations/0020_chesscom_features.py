import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0019_fairplay_compliance"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="takeback_requested_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="takeback_requests_made",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="conditional_moves",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="game",
            name="variant",
            field=models.CharField(
                choices=[
                    ("standard", "Standard"),
                    ("chess960", "Chess960"),
                    ("crazyhouse", "Crazyhouse"),
                    ("kingofthehill", "King of the Hill"),
                    ("threecheck", "Three-check"),
                    ("atomic", "Atomic"),
                ],
                default="standard",
                max_length=20,
            ),
        ),
    ]
