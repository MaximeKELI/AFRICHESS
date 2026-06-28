#pragma once

#include <vector>

#include "fairplay/stockfish_client.hpp"
#include "fairplay/types.hpp"

namespace fairplay {

struct DetectorContext {
  const GameInput* input = nullptr;
  const std::vector<EngineMoveAnalysis>* engine_evals = nullptr;
  const std::vector<MoveInput>* player_moves = nullptr;
};

void run_all_detectors(DetectorContext ctx, AnalysisResult& out);

}  // namespace fairplay
