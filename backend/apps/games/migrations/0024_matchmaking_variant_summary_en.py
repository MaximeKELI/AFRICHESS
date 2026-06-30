from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0023_matchmakingqueue_time_control_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameanalysis",
            name="summary_en",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="matchmakingqueue",
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
