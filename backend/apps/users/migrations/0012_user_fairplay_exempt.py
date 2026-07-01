from django.db import migrations, models


def grant_maxime_keli_exempt(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(username="Maxime_KELI").update(fairplay_exempt=True)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0011_user_stripe_customer_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="fairplay_exempt",
            field=models.BooleanField(
                default=False,
                help_text="Exempté de télémétrie, anti-triche et sanctions Fair Play automatiques",
            ),
        ),
        migrations.RunPython(grant_maxime_keli_exempt, migrations.RunPython.noop),
    ]
