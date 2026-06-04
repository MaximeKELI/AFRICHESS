from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar_preset",
            field=models.CharField(
                blank=True,
                default="avatar-1",
                help_text="Preset avatar id (avatar-1 … avatar-8)",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="chess_level",
            field=models.CharField(
                choices=[
                    ("beginner", "Débutant"),
                    ("intermediate", "Intermédiaire"),
                    ("advanced", "Avancé"),
                    ("expert", "Expert"),
                    ("master", "Maître"),
                ],
                default="intermediate",
                max_length=20,
            ),
        ),
    ]
