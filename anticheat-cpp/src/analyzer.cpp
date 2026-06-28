#include "fairplay/detectors.hpp"
#include "fairplay/json_io.hpp"
#include "fairplay/stockfish_client.hpp"
#include "fairplay/types.hpp"

#include <algorithm>

namespace fairplay {

AnalysisResult analyze_game(const GameInput& input, AnalysisMode mode) {
  AnalysisResult result;
  if (input.moves.empty()) {
    return result;
  }

  std::vector<MoveInput> player_moves;
  std::vector<EngineMoveAnalysis> player_engine_evals;
  std::vector<std::string> all_uci;
  all_uci.reserve(input.moves.size());
  for (const auto& mv : input.moves) {
    all_uci.push_back(mv.uci);
  }

  std::vector<EngineMoveAnalysis> engine_evals_all;
  if (mode == AnalysisMode::Full) {
    int depth = std::max(10, std::min(22, input.engine_depth));
    size_t move_count = input.moves.size();
    if (move_count > 50) {
      depth = std::max(10, depth - 2);
    }
    if (move_count > 80) {
      depth = std::max(8, depth - 2);
    }
    engine_evals_all = analyze_moves_with_stockfish(input.stockfish_path, all_uci, depth);
  } else {
    engine_evals_all.resize(input.moves.size());
  }

  for (size_t i = 0; i < input.moves.size(); ++i) {
    const auto& mv = input.moves[i];
    if (mv.played_by_white != input.player_is_white) {
      continue;
    }
    player_moves.push_back(mv);
    EngineMoveAnalysis ev;
    if (i < engine_evals_all.size()) {
      ev = engine_evals_all[i];
    }
    if (mode == AnalysisMode::Realtime) {
      ev.complexity_cp = mv.complexity_cp;
    }
    player_engine_evals.push_back(ev);
  }

  if (player_moves.empty()) {
    return result;
  }

  DetectorContext ctx;
  ctx.input = &input;
  ctx.engine_evals = &player_engine_evals;
  ctx.player_moves = &player_moves;
  run_all_detectors(ctx, result);
  return result;
}

}  // namespace fairplay
