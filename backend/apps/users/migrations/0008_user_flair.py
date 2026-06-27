from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0007_userstats_puzzle_rush_daily_count_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="flair",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Emoji flair affiché à côté du pseudo",
                max_length=8,
            ),
        ),
    ]
