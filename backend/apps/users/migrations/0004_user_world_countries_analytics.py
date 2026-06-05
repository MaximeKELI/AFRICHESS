# Generated manually for world countries + registration analytics fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_user_avatar_chess_defaults"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="country",
            field=models.CharField(default="SN", max_length=2),
        ),
        migrations.AddField(
            model_name="user",
            name="birth_year",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[
                    ("male", "Male"),
                    ("female", "Female"),
                    ("other", "Other"),
                    ("undisclosed", "Prefer not to say"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="discovery_source",
            field=models.CharField(
                blank=True,
                choices=[
                    ("friend", "Friend"),
                    ("social", "Social media"),
                    ("search", "Search engine"),
                    ("tournament", "Tournament / club"),
                    ("school", "School"),
                    ("press", "Press / media"),
                    ("other", "Other"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="registration_locale",
            field=models.CharField(blank=True, default="", max_length=5),
        ),
    ]
