from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0009_user_vacation_until"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="profile_banner",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="user",
            name="totp_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="totp_secret",
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
