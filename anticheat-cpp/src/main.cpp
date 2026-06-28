#include "fairplay/json_io.hpp"
#include "fairplay/types.hpp"

#include <iostream>
#include <iterator>
#include <string>

int main() {
  std::string json(
      (std::istreambuf_iterator<char>(std::cin)),
      std::istreambuf_iterator<char>());
  if (json.empty()) {
    std::cerr << "{\"error\":\"empty input\"}" << std::endl;
    return 1;
  }

  fairplay::GameInput input = fairplay::parse_game_input(json);
  fairplay::AnalysisMode mode = fairplay::AnalysisMode::Full;
  if (input.analysis_mode == "realtime") {
    mode = fairplay::AnalysisMode::Realtime;
  }
  fairplay::AnalysisResult result = fairplay::analyze_game(input, mode);
  std::cout << fairplay::result_to_json(result) << std::endl;
  return 0;
}
