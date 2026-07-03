from django.db import migrations


def backfill_repetition_counts(apps, schema_editor):
    Game = apps.get_model("games", "Game")
    from apps.games.draw_rules import init_repetition_counts

    qs = Game.objects.filter(repetition_counts__isnull=True)
    for game in qs.iterator():
        try:
            counts = init_repetition_counts(game.fen, game.variant)
        except Exception:
            counts = {}
        Game.objects.filter(pk=game.pk).update(repetition_counts=counts)


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0030_perf_indexes"),
    ]

    operations = [
        migrations.RunPython(backfill_repetition_counts, migrations.RunPython.noop),
    ]
