from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tournaments", "0008_tournament_is_rated"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="is_international_cup",
            field=models.BooleanField(
                default=False,
                help_text="Coupe / circuit international (hors Afrique)",
            ),
        ),
    ]
