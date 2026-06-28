#include "fairplay/stockfish_client.hpp"

#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#include <algorithm>
#include <cstdlib>
#include <sstream>
#include <string>
#include <vector>

namespace fairplay {
namespace {

constexpr const char* kStartFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

}  // namespace

StockfishClient::StockfishClient(std::string path) : path_(std::move(path)) {
  int in_pipe[2];
  int out_pipe[2];
  if (pipe(in_pipe) != 0 || pipe(out_pipe) != 0) {
    return;
  }

  pid_ = fork();
  if (pid_ == 0) {
    dup2(in_pipe[0], STDIN_FILENO);
    dup2(out_pipe[1], STDOUT_FILENO);
    close(in_pipe[0]);
    close(in_pipe[1]);
    close(out_pipe[0]);
    close(out_pipe[1]);
    execlp(path_.c_str(), path_.c_str(), nullptr);
    _exit(127);
  }

  close(in_pipe[0]);
  close(out_pipe[1]);
  in_fd_ = in_pipe[1];
  out_fd_ = out_pipe[0];

  if (pid_ < 0) {
    return;
  }

  send("uci");
  if (!wait_for("uciok", 500)) {
    available_ = false;
    return;
  }
  send("isready");
  if (!wait_for("readyok", 200)) {
    available_ = false;
    return;
  }
  available_ = true;
}

StockfishClient::~StockfishClient() {
  if (available_ && in_fd_ >= 0) {
    send("quit");
    wait_for("bestmove", 50);
  }
  if (in_fd_ >= 0) {
    close(in_fd_);
    in_fd_ = -1;
  }
  if (out_fd_ >= 0) {
    close(out_fd_);
    out_fd_ = -1;
  }
  if (pid_ > 0) {
    waitpid(pid_, nullptr, 0);
    pid_ = -1;
  }
}

void StockfishClient::send(const std::string& cmd) {
  if (in_fd_ < 0) {
    return;
  }
  std::string line = cmd + "\n";
  if (write(in_fd_, line.c_str(), line.size()) < 0) {
    available_ = false;
  }
}

std::string StockfishClient::read_line() {
  if (out_fd_ < 0) {
    return "";
  }
  std::string out;
  char ch = 0;
  while (read(out_fd_, &ch, 1) == 1) {
    if (ch == '\n') {
      break;
    }
    out.push_back(ch);
  }
  return out;
}

bool StockfishClient::wait_for(const std::string& token, int max_lines) {
  for (int i = 0; i < max_lines; ++i) {
    std::string line = read_line();
    if (line.empty()) {
      return false;
    }
    if (line.find(token) != std::string::npos) {
      return true;
    }
  }
  return false;
}

int StockfishClient::parse_eval_cp(const std::string& line, bool white_pov) const {
  (void)white_pov;
  auto idx = line.find(" score ");
  if (idx == std::string::npos) {
    return 0;
  }
  std::istringstream iss(line.substr(idx + 7));
  std::string kind;
  int value = 0;
  iss >> kind >> value;
  if (kind == "cp") {
    return value;
  }
  if (kind == "mate") {
    return value > 0 ? 10000 : -10000;
  }
  return 0;
}

std::vector<std::string> StockfishClient::parse_pv(const std::string& line) const {
  std::vector<std::string> pv;
  auto idx = line.find(" pv ");
  if (idx == std::string::npos) {
    return pv;
  }
  std::istringstream iss(line.substr(idx + 4));
  std::string uci;
  while (iss >> uci) {
    pv.push_back(uci);
  }
  return pv;
}

EngineMoveAnalysis StockfishClient::analyze_move(
    const std::string& position,
    const std::string& played_uci,
    int depth) {
  EngineMoveAnalysis result;
  if (!available_) {
    return result;
  }

  send("ucinewgame");
  send("position " + position);
  send("go depth " + std::to_string(depth));

  int best_eval = 0;
  std::vector<std::string> best_pv;
  std::string line;
  for (int i = 0; i < 400; ++i) {
    line = read_line();
    if (line.empty()) {
      break;
    }
    if (line.rfind("info", 0) == 0 && line.find(" pv ") != std::string::npos) {
      best_eval = parse_eval_cp(line, true);
      best_pv = parse_pv(line);
    }
    if (line.rfind("bestmove", 0) == 0) {
      break;
    }
  }

  if (!best_pv.empty()) {
    result.best_uci = best_pv[0];
    result.pv_uci = best_pv;
  }
  result.eval_before_cp = best_eval;

  send("position " + position + " moves " + played_uci);
  send("go depth " + std::to_string(std::max(8, depth - 4)));

  int after_eval = best_eval;
  for (int i = 0; i < 300; ++i) {
    line = read_line();
    if (line.empty()) {
      break;
    }
    if (line.rfind("info", 0) == 0 && line.find(" pv ") != std::string::npos) {
      after_eval = parse_eval_cp(line, true);
    }
    if (line.rfind("bestmove", 0) == 0) {
      break;
    }
  }
  result.eval_after_cp = after_eval;

  bool white_to_move = position.find(" w ") != std::string::npos || position == "startpos";
  int loss = white_to_move ? best_eval - after_eval : after_eval - best_eval;
  if (loss < 0) {
    loss = 0;
  }
  result.centipawn_loss = loss;
  result.complexity_cp = std::min(800, std::max(0, std::abs(best_eval)));
  return result;
}

std::vector<EngineMoveAnalysis> analyze_moves_with_stockfish(
    const std::string& stockfish_path,
    const std::vector<std::string>& uci_moves,
    int depth) {
  std::vector<EngineMoveAnalysis> out;
  StockfishClient engine(stockfish_path);
  if (!engine.available()) {
    return out;
  }

  std::string prefix = "startpos";
  for (const auto& uci : uci_moves) {
    EngineMoveAnalysis ev = engine.analyze_move(prefix, uci, depth);
    out.push_back(ev);
    prefix += " moves " + uci;
  }
  return out;
}

}  // namespace fairplay
