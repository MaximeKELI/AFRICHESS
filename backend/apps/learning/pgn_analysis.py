"""Analyse PGN via Stockfish avec explications en français."""

from apps.games.engine import ChessEngineService

CLASS_FR = {
    "best": "excellent",
    "good": "bon",
    "inaccuracy": "imprécision",
    "mistake": "faute",
    "blunder": "gaffe",
}

ADVICE_FR = {
    "blunder": "Ce coup perd nettement l'avantage. Cherchez les échecs et captures forcées.",
    "mistake": "Une meilleure continuation existait. Relisez les menaces de l'adversaire.",
    "inaccuracy": "Léger écart du meilleur coup. Affinez votre calcul.",
    "good": "Coup solide, proche de l'optimal.",
    "best": "Le meilleur coup selon le moteur.",
}


def explain_move(classification: str, san: str, cp_loss: int) -> str:
    label = CLASS_FR.get(classification, classification)
    base = ADVICE_FR.get(classification, "")
    return f"{san} — {label} (perte ~{cp_loss} centipawns). {base}".strip()


def analyze_pgn(pgn: str, depth: int = 12) -> dict:
    engine = ChessEngineService()
    evaluations = engine.analyze_game(pgn)
    moves = []
    blunders = mistakes = inaccuracies = 0

    for ev in evaluations:
        if ev.classification == "blunder":
            blunders += 1
        elif ev.classification == "mistake":
            mistakes += 1
        elif ev.classification == "inaccuracy":
            inaccuracies += 1
        moves.append({
            "san": ev.san,
            "uci": ev.uci,
            "eval_before": ev.eval_before,
            "eval_after": ev.eval_after,
            "centipawn_loss": ev.centipawn_loss,
            "classification": ev.classification,
            "classification_fr": CLASS_FR.get(ev.classification, ev.classification),
            "explanation_fr": explain_move(ev.classification, ev.san, ev.centipawn_loss),
        })

    summary_fr = _build_summary(blunders, mistakes, inaccuracies, len(moves))

    return {
        "moves": moves,
        "summary": {
            "total_moves": len(moves),
            "blunders": blunders,
            "mistakes": mistakes,
            "inaccuracies": inaccuracies,
            "accuracy_estimate": _accuracy(len(moves), blunders, mistakes, inaccuracies),
        },
        "summary_fr": summary_fr,
    }


def _accuracy(total: int, blunders: int, mistakes: int, inaccuracies: int) -> float:
    if total == 0:
        return 0.0
    errors = blunders * 3 + mistakes * 2 + inaccuracies
    return max(0.0, round(100 - (errors / total) * 15, 1))


def _build_summary(blunders: int, mistakes: int, inaccuracies: int, total: int) -> str:
    if total == 0:
        return "Aucun coup à analyser."
    parts = [f"Analyse de {total} coups."]
    if blunders:
        parts.append(f"{blunders} gaffe(s) majeure(s).")
    if mistakes:
        parts.append(f"{mistakes} faute(s).")
    if inaccuracies:
        parts.append(f"{inaccuracies} imprécision(s).")
    if blunders + mistakes > total * 0.2:
        parts.append("Conseil : ralentissez aux moments critiques et vérifiez les captures.")
    elif blunders == 0 and mistakes <= 1:
        parts.append("Belle précision globale — continuez ainsi !")
    return " ".join(parts)
