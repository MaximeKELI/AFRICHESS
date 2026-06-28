#include "fairplay/json_io.hpp"

#include <cmath>
#include <sstream>

namespace fairplay {
namespace {

std::string trim(const std::string& s) {
  size_t start = s.find_first_not_of(" \t\r\n");
  if (start == std::string::npos) {
    return "";
  }
  size_t end = s.find_last_not_of(" \t\r\n");
  return s.substr(start, end - start + 1);
}

size_t find_key(const std::string& json, const std::string& key, size_t from = 0) {
  return json.find("\"" + key + "\"", from);
}

std::string extract_quoted(const std::string& json, size_t pos) {
  pos = json.find(':', pos);
  if (pos == std::string::npos) {
    return "";
  }
  pos = json.find('"', pos);
  if (pos == std::string::npos) {
    return "";
  }
  ++pos;
  std::string out;
  while (pos < json.size()) {
    char c = json[pos++];
    if (c == '\\' && pos < json.size()) {
      out.push_back(json[pos++]);
      continue;
    }
    if (c == '"') {
      break;
    }
    out.push_back(c);
  }
  return out;
}

std::string extract_number_token(const std::string& json, size_t pos) {
  pos = json.find(':', pos);
  if (pos == std::string::npos) {
    return "";
  }
  ++pos;
  while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) {
    ++pos;
  }
  size_t end = pos;
  while (end < json.size() && std::string("0123456789+-.").find(json[end]) != std::string::npos) {
    ++end;
  }
  return trim(json.substr(pos, end - pos));
}

bool extract_bool(const std::string& json, size_t pos) {
  pos = json.find(':', pos);
  if (pos == std::string::npos) {
    return false;
  }
  return json.find("true", pos) < json.find("false", pos);
}

}  // namespace

std::string parse_string_field(const std::string& json, const std::string& key) {
  size_t pos = find_key(json, key);
  if (pos == std::string::npos) {
    return "";
  }
  return extract_quoted(json, pos);
}

int parse_int_field(const std::string& json, const std::string& key, int default_value) {
  size_t pos = find_key(json, key);
  if (pos == std::string::npos) {
    return default_value;
  }
  std::string token = extract_number_token(json, pos);
  if (token.empty()) {
    return default_value;
  }
  try {
    return std::stoi(token);
  } catch (...) {
    return default_value;
  }
}

double parse_double_field(const std::string& json, const std::string& key, double default_value) {
  size_t pos = find_key(json, key);
  if (pos == std::string::npos) {
    return default_value;
  }
  std::string token = extract_number_token(json, pos);
  if (token.empty()) {
    return default_value;
  }
  try {
    return std::stod(token);
  } catch (...) {
    return default_value;
  }
}

bool parse_bool_field(const std::string& json, const std::string& key, bool default_value) {
  size_t pos = find_key(json, key);
  if (pos == std::string::npos) {
    return default_value;
  }
  pos = json.find(':', pos);
  if (pos == std::string::npos) {
    return default_value;
  }
  std::string tail = json.substr(pos, 12);
  if (tail.find("true") != std::string::npos) {
    return true;
  }
  if (tail.find("false") != std::string::npos) {
    return false;
  }
  return default_value;
}

std::vector<std::string> extract_objects(const std::string& json, const std::string& array_key) {
  std::vector<std::string> out;
  size_t pos = find_key(json, array_key);
  if (pos == std::string::npos) {
    return out;
  }
  pos = json.find('[', pos);
  if (pos == std::string::npos) {
    return out;
  }
  ++pos;
  int depth = 0;
  size_t start = std::string::npos;
  for (; pos < json.size(); ++pos) {
    char c = json[pos];
    if (c == '{') {
      if (depth == 0) {
        start = pos;
      }
      ++depth;
    } else if (c == '}') {
      --depth;
      if (depth == 0 && start != std::string::npos) {
        out.push_back(json.substr(start, pos - start + 1));
        start = std::string::npos;
      }
    } else if (c == ']' && depth == 0) {
      break;
    }
  }
  return out;
}

TelemetryInput parse_telemetry(const std::string& json) {
  TelemetryInput t;
  size_t pos = find_key(json, "telemetry");
  if (pos == std::string::npos) {
    return t;
  }
  pos = json.find('{', pos);
  if (pos == std::string::npos) {
    return t;
  }
  size_t end = json.find('}', pos);
  if (end == std::string::npos) {
    return t;
  }
  std::string block = json.substr(pos, end - pos + 1);
  t.tab_blur_count = parse_int_field(block, "tab_blur_count");
  t.focus_loss_ms = parse_int_field(block, "focus_loss_ms");
  t.window_switch_count = parse_int_field(block, "window_switch_count");
  t.copy_paste_events = parse_int_field(block, "copy_paste_events");
  t.devtools_open_count = parse_int_field(block, "devtools_open_count");
  t.mouse_entropy = parse_double_field(block, "mouse_entropy");
  t.premove_count = parse_int_field(block, "premove_count");
  return t;
}

MoveInput parse_move_object(const std::string& obj) {
  MoveInput m;
  m.uci = parse_string_field(obj, "uci");
  m.san = parse_string_field(obj, "san");
  m.played_by_white = parse_bool_field(obj, "played_by_white", true);
  m.move_number = parse_int_field(obj, "move_number");
  m.think_ms = parse_int_field(obj, "think_ms");
  m.complexity_cp = parse_int_field(obj, "complexity_cp");
  return m;
}

PlayerBaseline parse_baseline(const std::string& json) {
  PlayerBaseline b;
  size_t pos = find_key(json, "baseline");
  if (pos == std::string::npos) {
    return b;
  }
  pos = json.find('{', pos);
  if (pos == std::string::npos) {
    return b;
  }
  size_t end = pos + 1;
  int depth = 1;
  while (end < json.size() && depth > 0) {
    if (json[end] == '{') {
      ++depth;
    } else if (json[end] == '}') {
      --depth;
    }
    ++end;
  }
  std::string block = json.substr(pos, end - pos);
  b.games_analyzed = parse_int_field(block, "games_analyzed");
  b.avg_accuracy = parse_double_field(block, "avg_accuracy");
  b.avg_top1_rate = parse_double_field(block, "avg_top1_rate");
  b.avg_cpl = parse_double_field(block, "avg_cpl");
  b.avg_overall_score = parse_double_field(block, "avg_overall_score");
  return b;
}

GameInput parse_game_input(const std::string& json) {
  GameInput input;
  input.game_id = parse_string_field(json, "game_id");
  input.player_elo = parse_int_field(json, "player_elo", 1200);
  input.player_is_white = parse_bool_field(json, "player_is_white", true);
  input.mode = parse_string_field(json, "mode");
  if (input.mode.empty()) {
    input.mode = "blitz";
  }
  input.is_rated = parse_bool_field(json, "is_rated", true);
  input.stockfish_path = parse_string_field(json, "stockfish_path");
  if (input.stockfish_path.empty()) {
    input.stockfish_path = "/usr/games/stockfish";
  }
  input.engine_depth = parse_int_field(json, "engine_depth", 16);
  input.analysis_mode = parse_string_field(json, "analysis_mode");
  if (input.analysis_mode.empty()) {
    input.analysis_mode = "full";
  }
  input.telemetry = parse_telemetry(json);
  input.baseline = parse_baseline(json);
  for (const auto& obj : extract_objects(json, "moves")) {
    input.moves.push_back(parse_move_object(obj));
  }
  return input;
}

std::string escape_json(const std::string& s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (char c : s) {
    switch (c) {
      case '\\':
        out += "\\\\";
        break;
      case '"':
        out += "\\\"";
        break;
      case '\n':
        out += "\\n";
        break;
      case '\r':
        out += "\\r";
        break;
      case '\t':
        out += "\\t";
        break;
      default:
        out.push_back(c);
        break;
    }
  }
  return out;
}

std::string result_to_json(const AnalysisResult& result) {
  std::ostringstream oss;
  oss << "{";
  oss << "\"overall_score\":" << result.overall_score << ",";
  oss << "\"verdict\":\"" << escape_json(result.verdict) << "\",";
  oss << "\"engine_top1_rate\":" << result.engine_top1_rate << ",";
  oss << "\"engine_top3_rate\":" << result.engine_top3_rate << ",";
  oss << "\"avg_centipawn_loss\":" << result.avg_centipawn_loss << ",";
  oss << "\"accuracy_estimate\":" << result.accuracy_estimate << ",";
  oss << "\"signals\":[";
  for (size_t i = 0; i < result.signals.size(); ++i) {
    const Signal& s = result.signals[i];
    if (i) {
      oss << ",";
    }
    oss << "{"
        << "\"code\":\"" << escape_json(s.code) << "\","
        << "\"score\":" << s.score << ","
        << "\"weight\":" << s.weight << ","
        << "\"detail\":\"" << escape_json(s.detail) << "\""
        << "}";
  }
  oss << "],\"move_evals\":[";
  for (size_t i = 0; i < result.move_evals.size(); ++i) {
    const MoveEngineEval& m = result.move_evals[i];
    if (i) {
      oss << ",";
    }
    oss << "{"
        << "\"uci\":\"" << escape_json(m.uci) << "\","
        << "\"is_top1\":" << (m.is_top1 ? "true" : "false") << ","
        << "\"is_top3\":" << (m.is_top3 ? "true" : "false") << ","
        << "\"centipawn_loss\":" << m.centipawn_loss << ","
        << "\"classification\":\"" << escape_json(m.classification) << "\","
        << "\"eval_before_cp\":" << m.eval_before_cp << ","
        << "\"complexity_cp\":" << m.complexity_cp
        << "}";
  }
  oss << "]}";
  return oss.str();
}

}  // namespace fairplay
