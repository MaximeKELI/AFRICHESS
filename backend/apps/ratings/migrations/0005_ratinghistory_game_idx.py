from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ratings", "0004_glicko2_fields"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="ratinghistory",
            index=models.Index(fields=["game"], name="ratings_hist_game_idx"),
        ),
    ]
