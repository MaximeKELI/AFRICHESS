from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="ai_target_elo",
            field=models.PositiveIntegerField(
                default=1200,
                help_text="ELO UCI de l'IA pour cette partie",
            ),
        ),
    ]
