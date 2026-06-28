#include "fairplay/detectors.hpp"

#include <algorithm>
#include <cmath>
#include <numeric>
#include <set>
#include <sstream>

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

double elo_tolerance(int elo) {
  if (elo < 1200) {
    return 1.0;
  }
  return 1.0 + std::min(1.35, (elo - 1200) * 0.00075);
}

int min_engine_moves(const std::string& mode) {
  if (mode == "bullet") {
    return 10;
  }
  if (mode == "blitz") {
    return 12;
  }
  return 16;
}

bool has_baseline(const GameInput* input) {
  return input && input->baseline.games_analyzed >= 5;
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
  if (elo < 2600) {
    return 0.29 + (elo - 2200) * 0.00012;
  }
  return 0.34 + std::min(0.18, (elo - 2600) * 0.00004);
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
  if (elo < 2600) {
    return 42.0 - (elo - 2200) * 0.015;
  }
  return 36.0 - std::min(8.0, (elo - 2600) * 0.005);
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

bool exceeds_baseline(double current, double baseline_avg, double min_delta, double relative_delta) {
  if (baseline_avg <= 0.0) {
    return false;
  }
  return current > baseline_avg + std::max(min_delta, baseline_avg * relative_delta);
}

void detect_engine_correlation(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.engine_evals || !ctx.player_moves || ctx.player_moves->empty() || !ctx.input) {
    return;
  }
  const bool realtime = ctx.input->analysis_mode == "realtime";
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
  if (total == 0 || realtime) {
    return;
  }

  out.engine_top1_rate = static_cast<double>(top1) / total;
  out.engine_top3_rate = static_cast<double>(top3) / total;
  out.avg_centipawn_loss = cpl_sum / total;
  out.accuracy_estimate = accuracy_from_cpl(out.avg_centipawn_loss);

  if (total < min_engine_moves(ctx.input->mode)) {
    return;
  }

  const int elo = ctx.input->player_elo;
  const double tol = elo_tolerance(elo);
  const double exp_top1 = expected_top1_rate(elo);
  const double exp_cpl = expected_avg_cpl(elo);
  const auto& base = ctx.input->baseline;

  double top1_threshold = exp_top1 + (0.22 * tol);
  if (has_baseline(ctx.input)) {
    top1_threshold = std::max(top1_threshold, base.avg_top1_rate + 0.14);
  }
  if (out.engine_top1_rate > top1_threshold) {
    if (!has_baseline(ctx.input) || exceeds_baseline(out.engine_top1_rate, base.avg_top1_rate, 0.12, 0.18)) {
      add_signal(
          out,
          "ENGINE_TOP1_HIGH",
          (out.engine_top1_rate - top1_threshold) * 200.0,
          1.35,
          "Corrélation moteur top1 au-dessus du profil Elo/historique");
    }
  }

  double top3_threshold = 0.78 + (elo >= 2200 ? 0.08 : 0.0);
  if (has_baseline(ctx.input)) {
    top3_threshold = std::max(top3_threshold, base.avg_top1_rate + 0.28);
  }
  if (out.engine_top3_rate > top3_threshold && elo < 2400) {
    add_signal(
        out,
        "ENGINE_TOP3_HIGH",
        (out.engine_top3_rate - top3_threshold) * 160.0,
        1.1,
        "Trop de coups dans le top 3 moteur vs historique");
  }

  double cpl_threshold = exp_cpl - (22.0 * tol);
  if (has_baseline(ctx.input) && base.avg_cpl > 0.0) {
    cpl_threshold = std::min(cpl_threshold, base.avg_cpl - 12.0);
  }
  if (out.avg_centipawn_loss < cpl_threshold && total >= 18) {
    if (!has_baseline(ctx.input) || out.avg_centipawn_loss + 8.0 < base.avg_cpl) {
      add_signal(
          out,
          "CPL_TOO_LOW",
          (cpl_threshold - out.avg_centipawn_loss) * 1.4,
          1.2,
          "Perte centipawn inférieure au niveau attendu");
    }
  }

  double acc_threshold = 94.0 - std::min(6.0, (elo - 1200) * 0.004);
  if (has_baseline(ctx.input)) {
    acc_threshold = std::max(acc_threshold, base.avg_accuracy + 7.0);
  }
  if (out.accuracy_estimate > acc_threshold && elo < 2200) {
    if (!has_baseline(ctx.input) || exceeds_baseline(out.accuracy_estimate, base.avg_accuracy, 6.0, 0.08)) {
      add_signal(
          out,
          "ACCURACY_SPIKE",
          (out.accuracy_estimate - acc_threshold) * 1.8,
          1.0,
          "Précision exceptionnelle vs profil habituel");
    }
  }
}

void detect_timing(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.player_moves || ctx.player_moves->empty() || !ctx.input) {
    return;
  }
  const bool is_bullet = ctx.input->mode == "bullet";
  const bool is_blitz = ctx.input->mode == "blitz";
  std::vector<int> think_times;
  int instant_complex = 0;
  int critical_instant = 0;
  int sub_human = 0;
  for (const auto& mv : *ctx.player_moves) {
    if (mv.think_ms > 0) {
      think_times.push_back(mv.think_ms);
    }
    if (mv.complexity_cp >= 280 && mv.think_ms > 0 && mv.think_ms < 280) {
      ++instant_complex;
    }
    if (mv.complexity_cp >= 450 && mv.think_ms > 0 && mv.think_ms < 150) {
      ++critical_instant;
    }
    if (!is_bullet && mv.think_ms > 0 && mv.think_ms < 60) {
      ++sub_human;
    }
  }
  if (think_times.size() >= 10 && !is_bullet) {
    double sd = stddev(think_times);
    double mean = std::accumulate(think_times.begin(), think_times.end(), 0.0) / think_times.size();
    if (sd < 120.0 && mean > 2000.0) {
      add_signal(out, "TIMING_ROBOTIC", 48.0, 0.75, "Temps de réflexion anormalement uniformes");
    }
  }
  if (instant_complex >= 4 && !is_bullet) {
    add_signal(
        out,
        "INSTANT_COMPLEX",
        instant_complex * 11.0,
        0.85,
        "Coups très rapides sur positions complexes");
  }
  if (critical_instant >= 3) {
    add_signal(
        out,
        "CRITICAL_INSTANT",
        critical_instant * 18.0,
        1.05,
        "Réponses instantanées sur coups critiques");
  }
  if (sub_human >= 12 && !is_bullet && !is_blitz) {
    add_signal(out, "MOVE_TOO_FAST", sub_human * 3.0, 0.7, "Série de coups sous le seuil humain");
  }
}

void detect_telemetry(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.input) {
    return;
  }
  const auto& t = ctx.input->telemetry;
  if (t.tab_blur_count >= 12) {
    add_signal(out, "TAB_BLUR_SUSPECT", t.tab_blur_count * 3.0, 0.6, "Changements d'onglet fréquents");
  }
  if (t.focus_loss_ms >= 180000) {
    add_signal(
        out,
        "FOCUS_LOSS",
        std::min(65.0, t.focus_loss_ms / 4000.0),
        0.55,
        "Perte de focus prolongée pendant la partie");
  }
  if (t.window_switch_count >= 15) {
    add_signal(out, "WINDOW_SWITCH", t.window_switch_count * 2.5, 0.5, "Multiples changements de fenêtre");
  }
  if (t.copy_paste_events >= 3) {
    add_signal(out, "COPY_PASTE", t.copy_paste_events * 20.0, 1.05, "Copier-coller détecté en partie");
  }
  if (t.devtools_open_count >= 2) {
    add_signal(out, "DEVTOOLS", 35.0 + t.devtools_open_count * 12.0, 0.7, "Outils développeur ouverts");
  }
  if (t.mouse_entropy > 0.0 && t.mouse_entropy < 0.25) {
    add_signal(out, "LOW_MOUSE_ENTROPY", (0.25 - t.mouse_entropy) * 140.0, 0.45, "Mouvements souris atypiques");
  }
  if (t.premove_count >= 35 && ctx.input->mode != "bullet") {
    add_signal(out, "PREMOVE_ABUSE", t.premove_count * 1.0, 0.4, "Usage excessif de premoves");
  }
}

void detect_opening(DetectorContext ctx, AnalysisResult& out) {
  if (!ctx.engine_evals || !ctx.player_moves || !ctx.input) {
    return;
  }
  if (ctx.input->analysis_mode == "realtime") {
    return;
  }
  int opening_engine = 0;
  size_t limit = std::min<size_t>(15, ctx.player_moves->size());
  for (size_t i = 0; i < limit && i < ctx.engine_evals->size(); ++i) {
    if ((*ctx.engine_evals)[i].is_top1) {
      ++opening_engine;
    }
  }
  const int elo = ctx.input->player_elo;
  int opening_threshold = 11;
  if (elo >= 2000) {
    opening_threshold = 13;
  }
  if (limit < static_cast<size_t>(opening_threshold)) {
    opening_threshold = static_cast<int>(limit);
  }
  if (elo >= 2400) {
    return;
  }
  if (has_baseline(ctx.input) && ctx.input->baseline.avg_top1_rate >= 0.42) {
    return;
  }
  if (opening_engine >= opening_threshold && elo < 2000) {
    add_signal(
        out,
        "OPENING_ENGINE",
        opening_engine * 4.0,
        0.85,
        "Lignes d'ouverture alignées sur le moteur");
  }
}

void detect_performance_vs_elo(DetectorContext ctx, AnalysisResult& out) {
  if (out.move_evals.empty() || !ctx.input) {
    return;
  }
  if (ctx.input->analysis_mode == "realtime") {
    return;
  }
  if (static_cast<int>(out.move_evals.size()) < min_engine_moves(ctx.input->mode)) {
    return;
  }
  const int elo = ctx.input->player_elo;
  double perf_index = out.accuracy_estimate + out.engine_top1_rate * 32.0;
  double expected = 52.0 + std::min(32.0, (elo - 800) * 0.018);
  if (has_baseline(ctx.input)) {
    expected = std::max(expected, ctx.input->baseline.avg_accuracy + ctx.input->baseline.avg_top1_rate * 28.0);
  }
  double gap = perf_index - expected;
  double gap_threshold = 28.0 / elo_tolerance(elo);
  if (has_baseline(ctx.input)) {
    gap_threshold = std::max(gap_threshold, 18.0);
  }
  if (gap > gap_threshold) {
    if (!has_baseline(ctx.input) || gap > gap_threshold + 8.0) {
      add_signal(
          out,
          "PERFORMANCE_VS_ELO",
          gap * 1.8,
          1.2,
          "Performance globale au-dessus du profil Elo/historique");
    }
  }
}

int count_high_weight_engine_signals(const AnalysisResult& out) {
  static const std::set<std::string> engine_codes = {
      "ENGINE_TOP1_HIGH",
      "ENGINE_TOP3_HIGH",
      "CPL_TOO_LOW",
      "ACCURACY_SPIKE",
      "OPENING_ENGINE",
      "PERFORMANCE_VS_ELO",
  };
  int n = 0;
  for (const auto& s : out.signals) {
    if (engine_codes.count(s.code) && s.score >= 40.0) {
      ++n;
    }
  }
  return n;
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

  const int engine_hits = count_high_weight_engine_signals(out);
  const int total_signals = static_cast<int>(out.signals.size());

  if (out.overall_score >= 82.0 && engine_hits >= 2 && total_signals >= 3) {
    out.verdict = "likely_cheat";
  } else if (out.overall_score >= 68.0 && engine_hits >= 1 && total_signals >= 2) {
    out.verdict = "suspicious";
  } else if (out.overall_score >= 45.0) {
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
