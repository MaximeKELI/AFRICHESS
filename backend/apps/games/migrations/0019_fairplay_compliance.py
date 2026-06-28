# Generated manually — conformité Fair Play mondiale

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0018_fairplay_review"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="fairplayreport",
            name="verdict",
            field=models.CharField(
                choices=[
                    ("clean", "Clean"),
                    ("review", "Review"),
                    ("suspicious", "Suspicious"),
                    ("likely_cheat", "Likely cheat"),
                    ("engine_unavailable", "Engine unavailable"),
                ],
                default="clean",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="FairPlayUserConsent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("consent_version", models.CharField(default="1.0", max_length=16)),
                ("consented_at", models.DateTimeField()),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, default="", max_length=512)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fairplay_consent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"indexes": [models.Index(fields=["-consented_at"], name="games_fairp_consent_idx")]},
        ),
        migrations.CreateModel(
            name="FairPlayAppeal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.TextField(max_length=4000)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("under_review", "Under review"),
                            ("accepted", "Accepted"),
                            ("rejected", "Rejected"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("staff_response", models.TextField(blank=True, default="")),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "review_case",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="appeals",
                        to="games.fairplayreviewcase",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fairplay_appeals",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["status", "-created_at"], name="games_fairp_appeal_idx")],
            },
        ),
        migrations.CreateModel(
            name="FairPlayAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("view_overview", "View overview"),
                            ("view_queue", "View queue"),
                            ("view_game", "View game"),
                            ("view_user", "View user"),
                            ("decide_case", "Decide case"),
                            ("engine_failure", "Engine failure"),
                            ("sanction_expired", "Sanction expired"),
                            ("appeal_resolved", "Appeal resolved"),
                        ],
                        max_length=32,
                    ),
                ),
                ("target_type", models.CharField(blank=True, default="", max_length=32)),
                ("target_id", models.CharField(blank=True, default="", max_length=64)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "staff",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="fairplay_audit_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["action", "-created_at"], name="games_fairp_audit_act_idx"),
                    models.Index(fields=["target_type", "target_id"], name="games_fairp_audit_tgt_idx"),
                ],
            },
        ),
    ]
