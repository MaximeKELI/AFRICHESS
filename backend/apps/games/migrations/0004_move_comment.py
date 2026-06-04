from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0003_game_ai_target_elo"),
    ]

    operations = [
        migrations.AddField(
            model_name="move",
            name="comment",
            field=models.TextField(blank=True, default=""),
        ),
    ]
