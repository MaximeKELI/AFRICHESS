#include "fairplay/detectors.hpp"

#include <algorithm>
#include <cmath>
#include <numeric>
#include <sstream>
#include <unordered_set>

namespace fairplay {
namespace {

void add_signal(AnalysisResult& out, const std::string& code, double score, double weight, const std::string& detail) {
  Signal s;
  s.code = code;
  s.score = std::min(100.0, std::max(0.0, score));
  s.weight = weight;
  s.detail = detail;
  out.signals.push_back(s);
}

double expected_top1_rate(int elo) {
  if (elo < 800) {
    return 0.08;
  }
  if (elo < 1200) {
    return 0.12 + (elo - 800) * 0.00015;
  }
  if (elo < 1800) {
    return 0.18 + (elo - 1200) * 0.00012;
  }
  if (elo < 2200) {
    return 0.25 + (elo - 1800) * 0.00010;
  }
  return 0.29 + std::min(0.15, (elo - 2200) * 0.00005);
}

double expected_avg_cpl(int elo) {
  if (elo < 1000) {
    return 90.0;
  }
  if (elo < 1600) {
    return 90.0 - (elo - 1000) * 0.05;
  }
  if (elo < 2200) {
    return 60.0 - (elo - 1600) * 0.03;
  }
  return 42.0 - std::min(12.0, (elo - 2200) * 0.01);
}

double stddev(const std::vector<int>& values) {
  if (values.size() < 2) {
    return 0.0;
  }
  double mean = std::accumulate(values.begin(), values.end(), 0.0) / values.size();
  double acc = 0.0;
  for (int v : values) {
    double d = v - mean;
    acc += d * d;
  }
  return std::sqrt(acc / values.size());
}

std::string classify_cpl(int cpl) {
  if (cpl <= 10) {
    return "best";
  }
  if (cpl <= 25) {
    return "excellent";
  }
  if (cpl <= 50) {
    return "good";
  }
  if (cpl <= 100) {
    return "inaccuracy";
  }
  if (cpl <= 300) {
    return "mistake";
  }
  return "blunder";
}

double accuracy_from_cpl(double avg_cpl) {
  return std::max(0.0, std::min(100.0, 103.1668 * std::exp(-0.04354 * avg_cpl) - 3.1669));
}

void detect_engine_correlation(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.engine_evals || !ctx.player_moves || ctx.player_moves->empty()) {
    return;
  }
  int top1 = 0;
  int top3 = 0;
  int total = 0;
  double cpl_sum = 0.0;
  for (size_t i = 0; i < ctx.player_moves->size() && i < ctx.engine_evals->size(); ++i) {
    const auto& ev = (*ctx.engine_evals)[i];
    const auto& mv = (*ctx.player_moves)[i];
    MoveEngineEval row;
    row.uci = mv.uci;
    row.is_top1 = ev.is_top1;
    row.is_top3 = ev.is_top3;
    row.centipawn_loss = ev.centipawn_loss;
    row.eval_before_cp = ev.eval_before_cp;
    row.complexity_cp = ev.complexity_cp;
    row.classification = classify_cpl(ev.centipawn_loss);
    out.move_evals.push_back(row);
    top1 += ev.is_top1 ? 1 : 0;
    top3 += ev.is_top3 ? 1 : 0;
    cpl_sum += ev.centipawn_loss;
    ++total;
  }
  if (total == 0) {
    return;
  }
  out.engine_top1_rate = static_cast<double>(top1) / total;
  out.engine_top3_rate = static_cast<double>(top3) / total;
  out.avg_centipawn_loss = cpl_sum / total;
  out.accuracy_estimate = accuracy_from_cpl(out.avg_centipawn_loss);

  double exp_top1 = expected_top1_rate(ctx.input->player_elo);
  double exp_cpl = expected_avg_cpl(ctx.input->player_elo);
  double top1_delta = out.engine_top1_rate - exp_top1;
  if (top1_delta > 0.18) {
    add_signal(
        out,
        "ENGINE_TOP1_HIGH",
        top1_delta * 220.0,
        1.4,
        "Corrélation moteur top1 anormalement élevée pour l'Elo");
  }
  if (out.engine_top3_rate > 0.72 && ctx.input->player_elo < 2000) {
    add_signal(
        out,
        "ENGINE_TOP3_HIGH",
        (out.engine_top3_rate - 0.55) * 180.0,
        1.2,
        "Trop de coups dans le top 3 moteur");
  }
  if (out.avg_centipawn_loss + 18.0 < exp_cpl) {
    add_signal(
        out,
        "CPL_TOO_LOW",
        (exp_cpl - out.avg_centipawn_loss) * 1.6,
        1.3,
        "Perte centipawn moyenne inférieure au niveau attendu");
  }
  if (out.accuracy_estimate > 92.0 && ctx.input->player_elo < 1700) {
    add_signal(
        out,
        "ACCURACY_SPIKE",
        (out.accuracy_estimate - 88.0) * 2.0,
        1.1,
        "Précision exceptionnelle vs Elo déclaré");
  }
}

void detect_timing(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.player_moves || ctx.player_moves->empty()) {
    return;
  }
  std::vector<int> think_times;
  int instant_complex = 0;
  int critical_instant = 0;
  int robotic = 0;
  for (const auto& mv : *ctx.player_moves) {
    if (mv.think_ms > 0) {
      think_times.push_back(mv.think_ms);
    }
    if (mv.complexity_cp >= 250 && mv.think_ms > 0 && mv.think_ms < 350) {
      ++instant_complex;
    }
    if (mv.complexity_cp >= 400 && mv.think_ms > 0 && mv.think_ms < 200) {
      ++critical_instant;
    }
    if (mv.think_ms > 0 && mv.think_ms < 80) {
      ++robotic;
    }
  }
  if (think_times.size() >= 6) {
    double sd = stddev(think_times);
    double mean = std::accumulate(think_times.begin(), think_times.end(), 0.0) / think_times.size();
    if (sd < 180.0 && mean > 1200.0) {
      add_signal(out, "TIMING_ROBOTIC", 55.0, 0.9, "Temps de réflexion trop uniformes");
    }
  }
  if (instant_complex >= 3) {
    add_signal(
        out,
        "INSTANT_COMPLEX",
        instant_complex * 14.0,
        1.0,
        "Coups instantanés sur positions complexes");
  }
  if (critical_instant >= 2) {
    add_signal(
        out,
        "CRITICAL_INSTANT",
        critical_instant * 22.0,
        1.25,
        "Réponses instantanées sur coups critiques");
  }
  if (robotic >= 8 && ctx.input->mode != "bullet") {
    add_signal(out, "MOVE_TOO_FAST", robotic * 4.5, 0.85, "Série de coups sous le seuil humain");
  }
  int moves_per_min = static_cast<int>(ctx.player_moves->size());
  if (moves_per_min > 40 && ctx.input.mode != "bullet") {
    add_signal(out, "MOVE_BURST", moves_per_min * 1.2, 0.95, "Rafale de coups anormale");
  }
}

void detect_telemetry(DetectorContext ctx, AnalysisResult& out) {
  const auto& t = ctx.input.telemetry;
  if (t.tab_blur_count >= 8) {
    add_signal(out, "TAB_BLUR_SUSPECT", t.tab_blur_count * 4.0, 0.75, "Changements d'onglet fréquents");
  }
  if (t.focus_loss_ms >= 120000) {
    add_signal(
        out,
        "FOCUS_LOSS",
        std::min(80.0, t.focus_loss_ms / 3000.0),
        0.7,
        "Perte de focus prolongée pendant la partie");
  }
  if (t.window_switch_count >= 10) {
    add_signal(out, "WINDOW_SWITCH", t.window_switch_count * 3.5, 0.65, "Multiples changements de fenêtre");
  }
  if (t.copy_paste_events >= 2) {
    add_signal(out, "COPY_PASTE", t.copy_paste_events * 25.0, 1.15, "Copier-coller détecté en partie");
  }
  if (t.devtools_open_count >= 1) {
    add_signal(out, "DEVTOOLS", 45.0 + t.devtools_open_count * 15.0, 0.8, "Outils développeur ouverts");
  }
  if (t.mouse_entropy > 0.0 && t.mouse_entropy < 0.35) {
    add_signal(out, "LOW_MOUSE_ENTROPY", (0.35 - t.mouse_entropy) * 180.0, 0.6, "Mouvements souris atypiques");
  }
  if (t.premove_count >= 25 && ctx.input.mode != "bullet") {
    add_signal(out, "PREMOVE_ABUSE", t.premove_count * 1.5, 0.55, "Usage excessif de premoves");
  }
}

void detect_opening(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.engine_evals || !ctx.player_moves) {
    return;
  }
  int opening_engine = 0;
  size_t limit = std::min<size_t>(12, ctx.player_moves->size());
  for (size_t i = 0; i < limit && i < ctx.engine_evals->size(); ++i) {
    if ((*ctx.engine_evals)[i].is_top1) {
      ++opening_engine;
    }
  }
  if (opening_engine >= 10 && ctx.input.player_elo < 1900) {
    add_signal(
        out,
        "OPENING_ENGINE",
        opening_engine * 5.5,
        1.05,
        "Lignes d'ouverture alignées sur le moteur");
  }
}

void detect_performance_vs_elo(DetectorContext ctx, AnalysisResult& out) {
  if (out.move_evals.empty()) {
    return;
  }
  double perf_index = out.accuracy_estimate + out.engine_top1_rate * 35.0;
  double expected = 55.0 + std::min(25.0, (ctx.input.player_elo - 1000) * 0.025);
  double gap = perf_index - expected;
  if (gap > 22.0) {
    add_signal(
        out,
        "PERFORMANCE_VS_ELO",
        gap * 2.2,
        1.35,
        "Performance globale incompatible avec l'Elo");
  }
}

void finalize_verdict(AnalysisResult& out) {
  if (out.signals.empty()) {
    out.overall_score = 0.0;
    out.verdict = "clean";
    return;
  }
  double weighted = 0.0;
  double weight_sum = 0.0;
  for (const auto& s : out.signals) {
    weighted += s.score * s.weight;
    weight_sum += s.weight;
  }
  out.overall_score = weight_sum > 0.0 ? weighted / weight_sum : 0.0;
  if (out.overall_score >= 75.0) {
    out.verdict = "likely_cheat";
  } else if (out.overall_score >= 55.0) {
    out.verdict = "suspicious";
  } else if (out.overall_score >= 35.0) {
    out.verdict = "review";
  } else {
    out.verdict = "clean";
  }
}

}  // namespace

void run_all_detectors(DetectorContext ctx, AnalysisResult& out) {
  detect_engine_correlation(ctx, out);
  detect_timing(ctx, out);
  detect_telemetry(ctx, out);
  detect_opening(ctx, out);
  detect_performance_vs_elo(ctx, out);
  finalize_verdict(out);
}

}  // namespace fairplay
