from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tournaments", "0006_level2_daily_club"),
    ]

    operations = [
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
                    ("team_battle", "Team Battle"),
                ],
                default="swiss",
                max_length=20,
            ),
        ),
    ]
