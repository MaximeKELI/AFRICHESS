#include "fairplay/fairplay_api.h"
#include "fairplay/json_io.hpp"
#include "fairplay/types.hpp"

#include <cstring>
#include <string>

extern "C" int africhess_fairplay_analyze(
    const char* json_in,
    char* json_out,
    size_t json_out_size) {
  if (!json_in || !json_out || json_out_size == 0) {
    return 1;
  }
  try {
    fairplay::GameInput input = fairplay::parse_game_input(json_in);
    fairplay::AnalysisMode mode = fairplay::AnalysisMode::Full;
    if (input.analysis_mode == "realtime") {
      mode = fairplay::AnalysisMode::Realtime;
    }
    fairplay::AnalysisResult result = fairplay::analyze_game(input, mode);
    std::string out = fairplay::result_to_json(result);
    if (out.size() + 1 > json_out_size) {
      return 2;
    }
    std::memcpy(json_out, out.c_str(), out.size() + 1);
    return 0;
  } catch (...) {
    const char* err = "{\"error\":\"fairplay analyze exception\"}";
    if (std::strlen(err) + 1 > json_out_size) {
      return 3;
    }
    std::memcpy(json_out, err, std::strlen(err) + 1);
    return 4;
  }
}
