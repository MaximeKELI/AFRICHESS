"""Couche IA profonde pour Game Review — stratégie, plans, fusion Fair Play."""

from __future__ import annotations

from collections import defaultdict

PHASES = ("opening", "middlegame", "endgame")
TURNING_POINT_SWING_CP = 120


def _phase_accuracy(moves: list[dict], phase: str, white: bool) -> float | None:
    subset = [
        m
        for m in moves
        if m.get("phase") == phase and m.get("played_by_white") is white
    ]
    if not subset:
        return None
    losses = [float(m.get("cp_loss") or 0) for m in subset]
    avg_loss = sum(losses) / len(losses)
    return max(0.0, min(100.0, 100.0 - avg_loss * 0.35))


def _detect_turning_points(moves: list[dict]) -> list[dict]:
    moments: list[dict] = []
    prev_eval: float | None = None
    for i, m in enumerate(moves):
        ev = m.get("eval")
        if ev is None:
            continue
        ev_f = float(ev)
        if prev_eval is not None:
            swing = abs(ev_f - prev_eval)
            if swing >= TURNING_POINT_SWING_CP:
                side_fr = "Blancs" if m.get("played_by_white") else "Noirs"
                side_en = "White" if m.get("played_by_white") else "Black"
                if ev_f > prev_eval:
                    direction_fr = "avantage bascule"
                    direction_en = "advantage shifts"
                else:
                    direction_fr = "position se dégrade"
                    direction_en = "position worsens"
                moments.append(
                    {
                        "ply": i + 1,
                        "san": m.get("san"),
                        "eval_swing_cp": round(swing),
                        "eval_after": ev_f,
                        "text_fr": (
                            f"Coup {i + 1} ({side_fr}) {m.get('san')} — "
                            f"{direction_fr} (~{round(swing)} cp)."
                        ),
                        "text_en": (
                            f"Move {i + 1} ({side_en}) {m.get('san')} — "
                            f"{direction_en} (~{round(swing)} cp)."
                        ),
                    }
                )
        prev_eval = ev_f
    moments.sort(key=lambda x: x["eval_swing_cp"], reverse=True)
    return moments[:8]


def _weakest_phase(moves: list[dict]) -> tuple[str, float]:
    scores: dict[str, list[float]] = defaultdict(list)
    for m in moves:
        phase = m.get("phase") or "middlegame"
        cp = float(m.get("cp_loss") or 0)
        scores[phase].append(cp)
    if not scores:
        return "middlegame", 0.0
    avg_by_phase = {p: sum(v) / len(v) for p, v in scores.items()}
    worst = max(avg_by_phase.items(), key=lambda kv: kv[1])
    return worst[0], worst[1]


def _coaching_plan(
    moves: list[dict],
    *,
    accuracy_white: float | None,
    accuracy_black: float | None,
) -> tuple[str, str]:
    if not moves:
        return "", ""
    phase, avg_loss = _weakest_phase(moves)
    phase_fr = {
        "opening": "ouverture",
        "middlegame": "milieu de jeu",
        "endgame": "finale",
    }[phase]
    phase_en = phase
    blunders = sum(1 for m in moves if m.get("class") == "blunder")
    mistakes = sum(1 for m in moves if m.get("class") == "mistake")
    plan_fr = (
        f"Priorité : {phase_fr} (perte moyenne ~{avg_loss:.0f} cp/coup). "
    )
    plan_en = (
        f"Focus: {phase_en} (avg loss ~{avg_loss:.0f} cp/move). "
    )
    if blunders >= 2:
        plan_fr += "Travaillez le calcul des variantes forcées avant les coups critiques."
        plan_en += "Practice forcing lines before critical moves."
    elif mistakes >= 3:
        plan_fr += "Affinez la sélection des candidats : 2–3 coups max avant de jouer."
        plan_en += "Narrow candidate moves: pick 2–3 options before committing."
    elif (accuracy_white or 0) >= 85 or (accuracy_black or 0) >= 85:
        plan_fr += "Niveau solide — approfondissez les finales et la conversion d'avantage."
        plan_en += "Solid level — deepen endgames and advantage conversion."
    else:
        plan_fr += "Révisez les moments clés ci-dessous coup par coup."
        plan_en += "Review the key moments below move by move."
    return plan_fr, plan_en


def _move_coaching(moves: list[dict]) -> list[dict]:
    """Commentaires coach enrichis par coup (templates structurés)."""
    rows: list[dict] = []
    for i, m in enumerate(moves):
        cls = m.get("class", "")
        if cls not in ("blunder", "mistake", "brilliant", "great", "inaccuracy"):
            continue
        cp = int(m.get("cp_loss") or 0)
        best = m.get("best_san")
        side_fr = "Blancs" if m.get("played_by_white") else "Noirs"
        side_en = "White" if m.get("played_by_white") else "Black"
        if cls == "brilliant":
            fr = f"{side_fr} : coup brillant {m.get('san')} — initiative ou sacrifice justifié."
            en = f"{side_en}: brilliant {m.get('san')} — initiative or justified sacrifice."
        elif cls == "blunder":
            hint = f" Mieux : {best}." if best else ""
            fr = f"{side_fr} : gaffe sur {m.get('san')} (~{cp} cp).{hint}"
            en = f"{side_en}: blunder {m.get('san')} (~{cp} cp).{hint}"
        elif cls == "mistake":
            fr = f"{side_fr} : erreur {m.get('san')} — repérez la menace directe."
            en = f"{side_en}: mistake {m.get('san')} — spot the direct threat."
        else:
            fr = f"{side_fr} : {m.get('san')} — {cls} (~{cp} cp)."
            en = f"{side_en}: {m.get('san')} — {cls} (~{cp} cp)."
        rows.append({"ply": i + 1, "coach_fr": fr, "coach_en": en, "class": cls})
        if len(rows) >= 32:
            break
    return rows


def _integrity_crosscheck(
    moves: list[dict],
    integrity_hints: dict | None,
) -> list[dict]:
    """Signaux croisés analyse Stockfish × Fair Play (innovation AFRICHESS)."""
    if not integrity_hints:
        return []
    flags: list[dict] = []
    top1 = float(integrity_hints.get("engine_top1_rate") or 0)
    verdict = integrity_hints.get("verdict") or "clean"
    analysis_acc = integrity_hints.get("analysis_accuracy")
    if top1 >= 0.72 and analysis_acc is not None and analysis_acc < 70:
        flags.append(
            {
                "code": "analysis_fairplay_divergence",
                "text_fr": (
                    "Écart détecté : précision d'analyse modeste mais corrélation "
                    "moteur élevée — signal revue intégrité."
                ),
                "text_en": (
                    "Divergence: modest analysis accuracy but high engine "
                    "correlation — integrity review signal."
                ),
            }
        )
    if verdict in ("suspicious", "likely_cheat"):
        flags.append(
            {
                "code": "fairplay_verdict",
                "text_fr": "Rapport Fair Play : comportement atypique pour ce niveau.",
                "text_en": "Fair Play report: atypical behavior for this rating band.",
            }
        )
    brilliant_count = sum(1 for m in moves if m.get("class") in ("brilliant", "great"))
    if brilliant_count >= 3 and top1 >= 0.68:
        flags.append(
            {
                "code": "engine_brilliance_cluster",
                "text_fr": "Cluster de coups moteur-like — surveiller la constance.",
                "text_en": "Cluster of engine-like moves — monitor consistency.",
            }
        )
    return flags


def build_deep_review(
    moves: list[dict],
    *,
    accuracy_white: float | None,
    accuracy_black: float | None,
    depth: int,
    integrity_hints: dict | None = None,
) -> dict:
    """Construit le JSON deep_review pour GameAnalysis."""
    phase_report: dict[str, dict] = {}
    for phase in PHASES:
        wa = _phase_accuracy(moves, phase, True)
        ba = _phase_accuracy(moves, phase, False)
        phase_report[phase] = {
            "white_accuracy": round(wa, 1) if wa is not None else None,
            "black_accuracy": round(ba, 1) if ba is not None else None,
            "summary_fr": (
                f"{phase.capitalize()} : "
                f"Blancs {wa:.0f} % / Noirs {ba:.0f} %."
                if wa is not None and ba is not None
                else ""
            ),
            "summary_en": (
                f"{phase.capitalize()}: "
                f"White {wa:.0f}% / Black {ba:.0f}%."
                if wa is not None and ba is not None
                else ""
            ),
        }
    plan_fr, plan_en = _coaching_plan(
        moves,
        accuracy_white=accuracy_white,
        accuracy_black=accuracy_black,
    )
    return {
        "analysis_depth": depth,
        "turning_points": _detect_turning_points(moves),
        "phase_report": phase_report,
        "coaching_plan_fr": plan_fr,
        "coaching_plan_en": plan_en,
        "move_coaching": _move_coaching(moves),
        "integrity_flags": _integrity_crosscheck(moves, integrity_hints),
        "engine": "stockfish_structured_nlg",
    }
