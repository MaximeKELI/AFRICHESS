from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0024_matchmaking_variant_summary_en"),
    ]

    operations = [
        migrations.AddField(
            model_name="fairplayreviewcase",
            name="auto_confidence",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="fairplayreviewcase",
            name="auto_recommended_decision",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
        migrations.AddField(
            model_name="fairplayreviewcase",
            name="decision_source",
            field=models.CharField(
                choices=[("human", "Human"), ("auto", "Auto")],
                default="human",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="fairplaysanction",
            name="is_automated",
            field=models.BooleanField(default=False),
        ),
    ]
