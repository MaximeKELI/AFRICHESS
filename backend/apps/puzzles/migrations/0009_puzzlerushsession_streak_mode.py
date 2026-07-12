from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("puzzles", "0008_puzzlebattle_player_indexes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="puzzlerushsession",
            name="mode",
            field=models.CharField(
                choices=[
                    ("rush", "Rush"),
                    ("storm", "Storm"),
                    ("survival", "Survival"),
                    ("streak", "Streak"),
                ],
                default="rush",
                max_length=20,
            ),
        ),
    ]
