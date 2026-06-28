#pragma once

#include <string>
#include <vector>

#include "fairplay/types.hpp"

namespace fairplay {

std::string parse_string_field(const std::string& json, const std::string& key);
int parse_int_field(const std::string& json, const std::string& key, int default_value = 0);
double parse_double_field(const std::string& json, const std::string& key, double default_value = 0.0);
bool parse_bool_field(const std::string& json, const std::string& key, bool default_value = false);

std::vector<std::string> extract_objects(const std::string& json, const std::string& array_key);
GameInput parse_game_input(const std::string& json);

std::string escape_json(const std::string& s);
std::string result_to_json(const AnalysisResult& result);

}  // namespace fairplay
