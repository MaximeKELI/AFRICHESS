from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0020_chesscom_features"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameanalysis",
            name="move_accuracy_white",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gameanalysis",
            name="move_accuracy_black",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
