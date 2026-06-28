#include "fairplay/detectors.hpp"
#include "fairplay/json_io.hpp"
#include "fairplay/stockfish_client.hpp"
#include "fairplay/types.hpp"

#include <algorithm>

namespace fairplay {

AnalysisResult analyze_game(const GameInput& input, AnalysisMode mode) {
  AnalysisResult result;
  std::vector<MoveInput> player_moves;
  for (const auto& mv : input.moves) {
    if (mv.played_by_white == input.player_is_white) {
      player_moves.push_back(mv);
    }
  }
  if (player_moves.empty()) {
    return result;
  }

  std::vector<EngineMoveAnalysis> engine_evals;
  if (mode == AnalysisMode::Full) {
    std::vector<std::string> uci_moves;
    uci_moves.reserve(player_moves.size());
    for (const auto& mv : player_moves) {
      uci_moves.push_back(mv.uci);
    }
    int depth = std::max(10, std::min(22, input.engine_depth));
    engine_evals = analyze_moves_with_stockfish(input.stockfish_path, uci_moves, depth);
  } else {
    engine_evals.resize(player_moves.size());
    for (size_t i = 0; i < player_moves.size(); ++i) {
      engine_evals[i].complexity_cp = player_moves[i].complexity_cp;
      engine_evals[i].centipawn_loss = 0;
    }
  }

  DetectorContext ctx;
  ctx.input = input;
  ctx.engine_evals = &engine_evals;
  ctx.player_moves = &player_moves;
  run_all_detectors(ctx, result);
  return result;
}

}  // namespace fairplay
