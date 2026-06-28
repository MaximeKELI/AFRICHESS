#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace fairplay {

struct MoveInput {
  std::string uci;
  std::string san;
  bool played_by_white = true;
  int move_number = 0;
  int think_ms = 0;
  int complexity_cp = 0;
};

struct TelemetryInput {
  int tab_blur_count = 0;
  int focus_loss_ms = 0;
  int window_switch_count = 0;
  int copy_paste_events = 0;
  int devtools_open_count = 0;
  double mouse_entropy = 0.0;
  int premove_count = 0;
};

struct GameInput {
  std::string game_id;
  int player_elo = 1200;
  bool player_is_white = true;
  std::string mode = "blitz";
  bool is_rated = true;
  std::vector<MoveInput> moves;
  TelemetryInput telemetry;
  std::string stockfish_path = "/usr/games/stockfish";
  int engine_depth = 16;
  std::string analysis_mode = "full";
};

struct MoveEngineEval {
  std::string uci;
  bool is_top1 = false;
  bool is_top3 = false;
  int centipawn_loss = 0;
  std::string classification;
  int eval_before_cp = 0;
  int complexity_cp = 0;
};

struct Signal {
  std::string code;
  double score = 0.0;
  double weight = 1.0;
  std::string detail;
};

struct AnalysisResult {
  double overall_score = 0.0;
  std::string verdict = "clean";
  std::vector<Signal> signals;
  std::vector<MoveEngineEval> move_evals;
  double engine_top1_rate = 0.0;
  double engine_top3_rate = 0.0;
  double avg_centipawn_loss = 0.0;
  double accuracy_estimate = 0.0;
};

enum class AnalysisMode { Full, Realtime };

AnalysisResult analyze_game(const GameInput& input, AnalysisMode mode = AnalysisMode::Full);

}  // namespace fairplay
