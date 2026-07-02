from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0028_phase4_variants"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="repetition_counts",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Occurrences par clé de transposition (répétition triple incrémentale).",
            ),
        ),
    ]
