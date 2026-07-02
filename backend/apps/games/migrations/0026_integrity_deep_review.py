"""Deep review JSON + AFRICHESS Integrity Engine profile."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0025_fairplay_auto_sanctions"),
        ("users", "0013_user_stripe_subscription_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameanalysis",
            name="analysis_depth_used",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="gameanalysis",
            name="deep_review_json",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.CreateModel(
            name="FairPlayIntegrityProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("trust_score", models.FloatField(default=85.0)),
                ("games_tracked", models.PositiveIntegerField(default=0)),
                ("clean_streak", models.PositiveIntegerField(default=0)),
                ("live_integrity_avg", models.FloatField(default=0.0)),
                ("last_fusion_score", models.FloatField(default=0.0)),
                ("timing_signature_json", models.JSONField(blank=True, default=dict)),
                ("shadow_pool", models.BooleanField(default=False)),
                (
                    "certificate_level",
                    models.CharField(default="silver", max_length=16),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="fairplay_integrity",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["shadow_pool", "-trust_score"],
                        name="games_fairp_shadow__a8c2f1_idx",
                    ),
                    models.Index(
                        fields=["-trust_score"],
                        name="games_fairp_trust_s_91b4e2_idx",
                    ),
                ],
            },
        ),
    ]
