# Generated manually — Phase 11 stripe_customer_id

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_profile_2fa"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="stripe_customer_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
