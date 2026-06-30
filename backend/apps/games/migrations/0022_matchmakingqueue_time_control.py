from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0021_gameanalysis_move_accuracy"),
    ]

    operations = [
        migrations.AddField(
            model_name="matchmakingqueue",
            name="time_control",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
    ]
