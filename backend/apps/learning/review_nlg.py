"""Synthèse narrative de revue de partie (sans LLM)."""

from __future__ import annotations


def generate_game_review(
    moves: list[dict],
    *,
    accuracy_white: float | None,
    accuracy_black: float | None,
    blunders_white: int,
    blunders_black: int,
) -> tuple[str, str, list[dict]]:
    """Retourne (summary_fr, summary_en, key_moments)."""
    if not moves:
        return "Aucun coup à analyser.", "No moves to analyze.", []

    total = len(moves)
    blunders = sum(1 for m in moves if m.get("class") == "blunder")
    mistakes = sum(1 for m in moves if m.get("class") == "mistake")
    inaccuracies = sum(1 for m in moves if m.get("class") == "inaccuracy")
    brilliant = sum(1 for m in moves if m.get("class") in ("brilliant", "great", "best"))

    parts_fr = [f"Revue de {total} coups."]
    parts_en = [f"Review of {total} moves."]
    if accuracy_white is not None and accuracy_black is not None:
        parts_fr.append(
            f"Précision : Blancs {accuracy_white:.0f} % — Noirs {accuracy_black:.0f} %."
        )
        parts_en.append(
            f"Accuracy: White {accuracy_white:.0f}% — Black {accuracy_black:.0f}%."
        )
    if blunders:
        parts_fr.append(f"{blunders} gaffe(s) décisive(s).")
        parts_en.append(f"{blunders} decisive blunder(s).")
    if mistakes:
        parts_fr.append(f"{mistakes} faute(s) significative(s).")
        parts_en.append(f"{mistakes} significant mistake(s).")
    if inaccuracies:
        parts_fr.append(f"{inaccuracies} imprécision(s).")
        parts_en.append(f"{inaccuracies} inaccuracy/inaccuracies.")
    if brilliant >= total * 0.3:
        parts_fr.append("Plusieurs coups de très haut niveau — belle maîtrise technique.")
        parts_en.append("Several top-level moves — strong technical play.")
    elif blunders + mistakes > total * 0.25:
        parts_fr.append(
            "Concentrez-vous sur le calcul des variantes forcées avant chaque coup critique."
        )
        parts_en.append("Focus on calculating forcing lines before each critical move.")
    elif blunders == 0 and mistakes <= 1:
        parts_fr.append("Partie solide — continuez à affûter vos finales.")
        parts_en.append("Solid game — keep sharpening your endgames.")

    key_moments = []
    priority = {
        "blunder": 0,
        "mistake": 1,
        "brilliant": 2,
        "great": 3,
        "inaccuracy": 4,
        "best": 5,
        "good": 6,
    }
    indexed = [
        (i, m)
        for i, m in enumerate(moves)
        if m.get("class") in priority
    ]
    indexed.sort(key=lambda pair: (priority.get(pair[1].get("class", ""), 9), pair[0]))

    for i, m in indexed:
        cls = m.get("class", "")
        side_fr = "Blancs" if m.get("played_by_white") else "Noirs"
        side_en = "White" if m.get("played_by_white") else "Black"
        cp = m.get("cp_loss") or 0
        label_fr = {
            "blunder": "moment décisif",
            "mistake": "erreur importante",
            "brilliant": "coup brillant",
            "great": "excellent coup",
            "inaccuracy": "imprécision",
            "best": "meilleur coup",
            "good": "bon coup",
        }.get(cls, cls)
        label_en = {
            "blunder": "decisive moment",
            "mistake": "major error",
            "brilliant": "brilliant move",
            "great": "excellent move",
            "inaccuracy": "inaccuracy",
            "best": "best move",
            "good": "good move",
        }.get(cls, cls)
        best = m.get("best_san")
        hint_fr = f" Mieux : {best}." if best and cls in ("blunder", "mistake", "inaccuracy") else ""
        hint_en = f" Better: {best}." if best and cls in ("blunder", "mistake", "inaccuracy") else ""
        key_moments.append({
            "ply": i + 1,
            "san": m.get("san"),
            "class": cls,
            "side": side_fr,
            "text": f"Coup {i + 1} ({side_fr}) — {m.get('san')} : {label_fr} (~{cp} cp).{hint_fr}",
            "text_en": f"Move {i + 1} ({side_en}) — {m.get('san')}: {label_en} (~{cp} cp).{hint_en}",
        })
        if len(key_moments) >= 24:
            break

    key_moments.sort(key=lambda km: km["ply"])

    return " ".join(parts_fr), " ".join(parts_en), key_moments
