from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("puzzles", "0002_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="puzzle",
            index=models.Index(
                fields=["is_daily", "daily_date"],
                name="puzzles_puz_is_dail_1a2b3c_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="puzzle",
            index=models.Index(
                fields=["difficulty"],
                name="puzzles_puz_difficu_4d5e6f_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="puzzleattempt",
            index=models.Index(
                fields=["user", "solved"],
                name="puzzles_puz_user_id_7g8h9i_idx",
            ),
        ),
    ]
