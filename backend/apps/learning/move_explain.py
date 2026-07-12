"""Explications de coups enrichies (PV + classification)."""

from __future__ import annotations

CLASS_FR = {
    "brilliant": "brillant",
    "great": "excellent",
    "best": "très bon",
    "book": "théorique",
    "good": "bon",
    "inaccuracy": "imprécision",
    "mistake": "faute",
    "blunder": "gaffe",
}

ADVICE_FR = {
    "blunder": "Ce coup change nettement l'évaluation. Repérez les échecs, captures et menaces.",
    "mistake": "Une meilleure continuation existait. Relisez les menaces adverses.",
    "inaccuracy": "Léger écart du meilleur coup. Affinez votre calcul.",
    "good": "Coup solide, proche de l'optimal.",
    "best": "Le meilleur coup selon le moteur.",
    "book": "Coup théorique — ligne d'ouverture connue.",
    "great": "Coup très fort — vous gardez ou reprenez l'initiative.",
    "brilliant": "Coup remarquable !",
}


def explain_move_detail(
    classification: str,
    san: str,
    cp_loss: int,
    *,
    best_san: str | None = None,
    pv_san: str | None = None,
) -> str:
    label = CLASS_FR.get(classification, classification)
    base = ADVICE_FR.get(classification, "")
    parts = [f"{san} — {label} (perte ~{cp_loss} cp)."]
    if best_san and classification in ("blunder", "mistake", "inaccuracy"):
        parts.append(f"Le moteur préfère {best_san}.")
    if pv_san and classification in ("blunder", "mistake"):
        parts.append(f"Variante : {pv_san[:80]}{'…' if len(pv_san) > 80 else ''}.")
    if base:
        parts.append(base)
    return " ".join(parts)
