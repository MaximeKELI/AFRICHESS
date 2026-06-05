from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_user_world_countries_analytics"),
    ]

    operations = [
        migrations.AddField(
            model_name="userstats",
            name="daily_puzzle_streak",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="userstats",
            name="daily_puzzle_last_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
