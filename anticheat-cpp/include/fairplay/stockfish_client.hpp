#pragma once

#include <string>
#include <vector>

namespace fairplay {

struct EngineMoveAnalysis {
  std::string best_uci;
  std::vector<std::string> pv_uci;
  int eval_before_cp = 0;
  int eval_after_cp = 0;
  int centipawn_loss = 0;
  int complexity_cp = 0;
};

class StockfishClient {
 public:
  explicit StockfishClient(std::string path);
  ~StockfishClient();

  StockfishClient(const StockfishClient&) = delete;
  StockfishClient& operator=(const StockfishClient&) = delete;

  bool available() const { return available_; }
  EngineMoveAnalysis analyze_move(const std::string& fen, const std::string& played_uci, int depth);

 private:
  void send(const std::string& cmd);
  std::string read_line();
  bool wait_for(const std::string& token, int max_lines = 200);
  int parse_eval_cp(const std::string& line, bool white_pov) const;
  std::vector<std::string> parse_pv(const std::string& line) const;

  std::string path_;
  int in_fd_ = -1;
  int out_fd_ = -1;
  int pid_ = -1;
  bool available_ = false;
};

std::vector<EngineMoveAnalysis> analyze_moves_with_stockfish(
    const std::string& stockfish_path,
    const std::vector<std::string>& uci_moves,
    int depth);

}  // namespace fairplay
