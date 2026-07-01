# Index pour échantillonnage training/rush sur pool 10k+

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("puzzles", "0005_rename_puzzles_puz_is_dail_1a2b3c_idx_puzzles_puz_is_dail_28282a_idx_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="puzzle",
            index=models.Index(fields=["difficulty", "rating"], name="puzzles_puz_diff_rat_idx"),
        ),
        migrations.AddIndex(
            model_name="puzzle",
            index=models.Index(fields=["source"], name="puzzles_puz_source_idx"),
        ),
    ]
