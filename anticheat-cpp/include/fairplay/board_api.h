#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/** Résultat apply_move standard (échiquier classique). */
typedef struct {
  char fen[100];
  char san[16];
  int32_t complexity_cp;
  int32_t game_over;
  int32_t ok;
} AfrichessMoveResult;

/** Applique un coup UCI sur FEN standard ; complexity_cp = position avant le coup. */
int africhess_standard_move(
    const char* fen,
    const char* uci,
    AfrichessMoveResult* out);

/** Heuristique complexité (standard) sans appliquer de coup. */
int africhess_complexity_cp(const char* fen);

#ifdef __cplusplus
}
#endif
