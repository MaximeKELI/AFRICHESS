# Generated manually for push notifications

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0004_rename_notificatio_user_id_7e8f9a_idx_notificatio_user_id_f2ad08_idx"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("game_invite", "Game Invite"),
                    ("match_found", "Match Found"),
                    ("friend_request", "Friend Request"),
                    ("tournament", "Tournament"),
                    ("achievement", "Achievement"),
                    ("system", "System"),
                ],
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name="DeviceToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.TextField()),
                (
                    "platform",
                    models.CharField(
                        choices=[("ios", "iOS"), ("android", "Android"), ("web", "Web")],
                        max_length=16,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[("expo", "Expo Push"), ("webpush", "Web Push")],
                        max_length=16,
                    ),
                ),
                ("subscription_json", models.JSONField(blank=True, default=dict)),
                ("device_id", models.CharField(blank=True, max_length=128)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_used_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="device_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "indexes": [models.Index(fields=["user", "is_active"], name="notificatio_user_id_active_idx")],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "token"),
                        name="notifications_unique_user_token",
                    )
                ],
            },
        ),
    ]
