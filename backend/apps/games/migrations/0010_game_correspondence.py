from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0009_game_stats_recorded"),
    ]

    operations = [
        migrations.AlterField(
            model_name="game",
            name="mode",
            field=models.CharField(
                choices=[
                    ("bullet", "Bullet (1+0)"),
                    ("blitz", "Blitz (3+2)"),
                    ("rapid", "Rapid (10+0)"),
                    ("classical", "Classical (30+0)"),
                    ("correspondence", "Correspondence (daily)"),
                    ("ai", "vs Computer"),
                    ("puzzle", "Puzzle"),
                ],
                default="blitz",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="days_per_move",
            field=models.PositiveSmallIntegerField(
                default=3,
                help_text="Jours par coup (parties correspondance)",
            ),
        ),
        migrations.AddField(
            model_name="game",
            name="turn_deadline",
            field=models.DateTimeField(
                blank=True,
                help_text="Date limite pour jouer le coup en cours",
                null=True,
            ),
        ),
    ]
