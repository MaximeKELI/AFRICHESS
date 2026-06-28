#include "fairplay/stockfish_client.hpp"

#include <array>
#include <cstdio>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace fairplay {
namespace {

std::string read_line(FILE* pipe) {
  char buffer[4096];
  if (!fgets(buffer, sizeof(buffer), pipe)) {
    return "";
  }
  std::string line(buffer);
  while (!line.empty() && (line.back() == '\n' || line.back() == '\r')) {
    line.pop_back();
  }
  return line;
}

void write_cmd(FILE* pipe, const std::string& cmd) {
  fprintf(pipe, "%s\n", cmd.c_str());
  fflush(pipe);
}

int score_to_cp(const std::string& score_token, const std::string& next_token) {
  if (score_token.find("mate") != std::string::npos) {
    try {
      int mate = std::stoi(next_token);
      return mate > 0 ? 10000 : -10000;
    } catch (...) {
      return 0;
    }
  }
  try {
    return std::stoi(next_token);
  } catch (...) {
    return 0;
  }
}

}  // namespace

StockfishClient::StockfishClient(std::string path) : path_(std::move(path)) {}

StockfishClient::~StockfishClient() {
  close();
}

void StockfishClient::close() {
  if (pipe_) {
    write_cmd(pipe_, "quit");
    pclose(pipe_);
    pipe_ = nullptr;
  }
}

void StockfishClient::ensure_open() {
  if (pipe_) {
    return;
  }
  std::string cmd = path_ + " 2>/dev/null";
  pipe_ = popen(cmd.c_str(), "w");
  if (!pipe_) {
    throw std::runtime_error("Impossible de lancer Stockfish: " + path_);
  }
  write_cmd(pipe_, "uci");
  write_cmd(pipe_, "isready");
  FILE* out = fdopen(fileno(pipe_), "r");
  (void)out;
  // Stockfish writes to stderr/stdout - popen only captures stdout one-way for write mode
  // Use bidirectional popen with "r+" or separate approach
  pclose(pipe_);
  pipe_ = popen(cmd.c_str(), "r");
  if (!pipe_) {
    throw std::runtime_error("Stockfish popen read failed");
  }
}

std::vector<std::string> StockfishClient::read_until(const std::string& token, int max_lines) {
  std::vector<std::string> lines;
  for (int i = 0; i < max_lines; ++i) {
    std::string line = read_line(pipe_);
    if (line.empty()) {
      break;
    }
    lines.push_back(line);
    if (line.find(token) != std::string::npos) {
      break;
    }
  }
  return lines;
}

}  // namespace fairplay
