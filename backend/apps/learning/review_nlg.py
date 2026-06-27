"""Synthèse narrative de revue de partie (sans LLM)."""

from __future__ import annotations


def generate_game_review(
    moves: list[dict],
    *,
    accuracy_white: float | None,
    accuracy_black: float | None,
    blunders_white: int,
    blunders_black: int,
) -> tuple[str, list[dict]]:
    """Retourne (summary_fr, key_moments)."""
    if not moves:
        return "Aucun coup à analyser.", []

    total = len(moves)
    blunders = sum(1 for m in moves if m.get("class") == "blunder")
    mistakes = sum(1 for m in moves if m.get("class") == "mistake")
    inaccuracies = sum(1 for m in moves if m.get("class") == "inaccuracy")
    brilliant = sum(1 for m in moves if m.get("class") in ("brilliant", "great", "best"))

    parts = [f"Revue de {total} coups."]
    if accuracy_white is not None and accuracy_black is not None:
        parts.append(
            f"Précision : Blancs {accuracy_white:.0f} % — Noirs {accuracy_black:.0f} %."
        )
    if blunders:
        parts.append(f"{blunders} gaffe(s) décisive(s).")
    if mistakes:
        parts.append(f"{mistakes} faute(s) significative(s).")
    if inaccuracies:
        parts.append(f"{inaccuracies} imprécision(s).")
    if brilliant >= total * 0.3:
        parts.append("Plusieurs coups de très haut niveau — belle maîtrise technique.")
    elif blunders + mistakes > total * 0.25:
        parts.append(
            "Concentrez-vous sur le calcul des variantes forcées avant chaque coup critique."
        )
    elif blunders == 0 and mistakes <= 1:
        parts.append("Partie solide — continuez à affûter vos finales.")

    key_moments = []
    for i, m in enumerate(moves):
        cls = m.get("class", "")
        if cls not in ("blunder", "mistake", "brilliant", "great"):
            continue
        side = "Blancs" if m.get("played_by_white") else "Noirs"
        cp = m.get("cp_loss") or 0
        label = {
            "blunder": "moment décisif",
            "mistake": "erreur importante",
            "brilliant": "coup brillant",
            "great": "excellent coup",
        }.get(cls, cls)
        best = m.get("best_san")
        hint = f" Mieux : {best}." if best and cls in ("blunder", "mistake") else ""
        key_moments.append({
            "ply": i + 1,
            "san": m.get("san"),
            "class": cls,
            "side": side,
            "text": f"Coup {i + 1} ({side}) — {m.get('san')} : {label} (~{cp} cp).{hint}",
        })
        if len(key_moments) >= 8:
            break

    return " ".join(parts), key_moments
