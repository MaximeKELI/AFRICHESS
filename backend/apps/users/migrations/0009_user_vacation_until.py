from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0008_user_flair"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="vacation_until",
            field=models.DateTimeField(
                blank=True,
                help_text="En vacances : les échéances daily chess sont suspendues",
                null=True,
            ),
        ),
    ]
