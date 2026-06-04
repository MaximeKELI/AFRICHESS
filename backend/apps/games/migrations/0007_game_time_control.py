from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0006_game_realtime_tournament"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="is_timed",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="game",
            name="time_control_minutes",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="matchmakingqueue",
            name="is_timed",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="matchmakingqueue",
            name="time_control_minutes",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
