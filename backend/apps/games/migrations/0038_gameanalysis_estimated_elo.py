# Generated for estimated game ELO (performance rating).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0037_tv_exhibition'),
    ]

    operations = [
        migrations.AddField(
            model_name='gameanalysis',
            name='est_elo_white',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='gameanalysis',
            name='est_elo_black',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
