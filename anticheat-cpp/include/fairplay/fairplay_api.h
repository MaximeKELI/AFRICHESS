#pragma once

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Analyse fair play in-process (JSON stdin → JSON stdout, sans fork).
 * Retourne 0 si succès, non-zero si erreur.
 */
int africhess_fairplay_analyze(
    const char* json_in,
    char* json_out,
    size_t json_out_size);

#ifdef __cplusplus
}
#endif
