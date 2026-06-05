# Generated manually for user activity tracking

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserActivityEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("session_id", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("page_view", "Page view"),
                            ("click", "Click"),
                            ("login", "Login"),
                            ("logout", "Logout"),
                            ("register", "Register"),
                            ("game_start", "Game start"),
                            ("game_end", "Game end"),
                            ("puzzle_attempt", "Puzzle attempt"),
                            ("lesson_complete", "Lesson complete"),
                            ("tournament_join", "Tournament join"),
                            ("friend_request", "Friend request"),
                            ("chat_message", "Chat message"),
                            ("profile_update", "Profile update"),
                            ("search", "Search"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("path", models.CharField(blank=True, default="", max_length=512)),
                ("element", models.CharField(blank=True, default="", max_length=256)),
                ("label", models.CharField(blank=True, default="", max_length=256)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("ip_hash", models.CharField(blank=True, default="", max_length=64)),
                ("user_agent", models.CharField(blank=True, default="", max_length=512)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="useractivityevent",
            index=models.Index(fields=["user", "-created_at"], name="analytics_u_user_id_6e0f0d_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivityevent",
            index=models.Index(fields=["event_type", "-created_at"], name="analytics_u_event_t_8c8f2a_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivityevent",
            index=models.Index(fields=["session_id", "-created_at"], name="analytics_u_session_4b2c1d_idx"),
        ),
    ]
