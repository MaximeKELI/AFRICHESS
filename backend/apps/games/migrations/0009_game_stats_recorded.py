from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0008_db_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="stats_recorded",
            field=models.BooleanField(
                default=False,
                help_text="True une fois les UserStats mises à jour pour cette partie",
            ),
        ),
    ]
