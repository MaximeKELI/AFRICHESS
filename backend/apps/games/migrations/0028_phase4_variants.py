from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0027_broadcast"),
    ]

    operations = [
        migrations.AlterField(
            model_name="game",
            name="variant",
            field=models.CharField(
                choices=[
                    ("standard", "Standard"),
                    ("chess960", "Chess960"),
                    ("crazyhouse", "Crazyhouse"),
                    ("kingofthehill", "King of the Hill"),
                    ("threecheck", "Three-check"),
                    ("atomic", "Atomic"),
                    ("antichess", "Antichess"),
                    ("horde", "Horde"),
                    ("racingkings", "Racing Kings"),
                ],
                default="standard",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="matchmakingqueue",
            name="variant",
            field=models.CharField(
                choices=[
                    ("standard", "Standard"),
                    ("chess960", "Chess960"),
                    ("crazyhouse", "Crazyhouse"),
                    ("kingofthehill", "King of the Hill"),
                    ("threecheck", "Three-check"),
                    ("atomic", "Atomic"),
                    ("antichess", "Antichess"),
                    ("horde", "Horde"),
                    ("racingkings", "Racing Kings"),
                ],
                default="standard",
                max_length=20,
            ),
        ),
    ]
