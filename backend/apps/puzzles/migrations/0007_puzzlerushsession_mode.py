# Generated manually — Puzzle Storm mode field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("puzzles", "0006_puzzle_pool_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="puzzlerushsession",
            name="mode",
            field=models.CharField(
                choices=[
                    ("rush", "Rush"),
                    ("storm", "Storm"),
                    ("survival", "Survival"),
                ],
                default="rush",
                max_length=20,
            ),
        ),
    ]
