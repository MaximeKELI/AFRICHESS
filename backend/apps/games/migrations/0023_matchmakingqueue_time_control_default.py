from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0022_matchmakingqueue_time_control"),
    ]

    operations = [
        migrations.RunSQL(
            sql="UPDATE games_matchmakingqueue SET time_control = '' WHERE time_control IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name="matchmakingqueue",
            name="time_control",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
    ]
