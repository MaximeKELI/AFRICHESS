from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("puzzles", "0007_lichess_parity"),
    ]

    operations = [
        migrations.AddField(
            model_name="puzzlebattle",
            name="index1",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="puzzlebattle",
            name="index2",
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
