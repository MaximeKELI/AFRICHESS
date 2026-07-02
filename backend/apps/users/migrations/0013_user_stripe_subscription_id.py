# Generated manually — Stripe subscription sync

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0012_user_fairplay_exempt"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="stripe_subscription_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
