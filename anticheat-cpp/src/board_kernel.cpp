#include "chess.hpp"
#include "fairplay/board_api.h"

#include <algorithm>
#include <cstring>
#include <string>
#include <string_view>

using namespace chess;

static int piece_value(PieceType pt) {
  switch (pt) {
    case PieceType::PAWN:
      return 100;
    case PieceType::KNIGHT:
      return 320;
    case PieceType::BISHOP:
      return 330;
    case PieceType::ROOK:
      return 500;
    case PieceType::QUEEN:
      return 900;
    default:
      return 0;
  }
}

static int complexity_from_board(const Board& board) {
  int material = 0;
  for (auto pt :
       {PieceType::PAWN, PieceType::KNIGHT, PieceType::BISHOP, PieceType::ROOK,
        PieceType::QUEEN}) {
    material += static_cast<int>(board.pieces(Color::WHITE, pt).count()) *
                piece_value(pt);
    material -= static_cast<int>(board.pieces(Color::BLACK, pt).count()) *
                piece_value(pt);
  }
  Movelist moves;
  movegen::legalmoves(moves, board);
  int complexity = std::min(
      800,
      std::abs(material) / 2 +
          static_cast<int>(board.fullMoveNumber()) * 6 +
          static_cast<int>(moves.size()) * 2);
  if (board.inCheck()) {
    complexity += 100;
  }
  return complexity;
}

extern "C" {

int africhess_complexity_cp(const char* fen) {
  if (!fen) {
    return 0;
  }
  try {
    Board board(fen);
    return complexity_from_board(board);
  } catch (...) {
    return 0;
  }
}

int africhess_standard_move(
    const char* fen,
    const char* uci,
    AfrichessMoveResult* out) {
  if (!fen || !uci || !out) {
    return 0;
  }
  std::memset(out, 0, sizeof(AfrichessMoveResult));
  try {
    Board board(fen);
    out->complexity_cp = complexity_from_board(board);
    Move move = uci::uciToMove(board, std::string_view(uci));
    if (move == Move::NO_MOVE || !board.isLegal(move)) {
      out->ok = 0;
      return 0;
    }
    std::string san = uci::moveToSan(board, move);
    board.makeMove<true>(move);
    std::string new_fen = board.getFen();
    std::strncpy(out->fen, new_fen.c_str(), sizeof(out->fen) - 1);
    std::strncpy(out->san, san.c_str(), sizeof(out->san) - 1);
    auto game_over = board.isGameOver();
    out->game_over =
        (game_over.first != GameResultReason::NONE) ? 1 : 0;
    out->ok = 1;
    return 1;
  } catch (...) {
    out->ok = 0;
    return 0;
  }
}

}  // extern "C"
