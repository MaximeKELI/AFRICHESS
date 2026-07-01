# Sons d'échecs

| Fichier      | Événement              | Source Lichess                          |
|--------------|------------------------|-----------------------------------------|
| move         | Déplacement            | `public/sound/lisp/Move`                |
| capture      | Prise                  | `public/sound/lisp/Capture`             |
| castle       | Roque                  | `public/sound/lisp/Castles`             |
| check        | **Échec** (alerte)     | `public/sound/sfx/Check`                |
| checkmate    | **Mat** (victoire)     | `public/sound/sfx/Victory`              |
| puzzle-success | **Puzzle résolu**    | Synthèse locale (fanfare)               |
| puzzle-wrong   | **Puzzle raté**      | Synthèse locale (buzz)                  |
| puzzle-advance | **Puzzle suivant**   | Synthèse locale (tick)                  |

Licence : [Lichess lila](https://github.com/lichess-org/lila) (AGPL-3.0).

Si les fichiers ne chargent pas, un repli Web Audio « killer » (grave + aigu) est utilisé pour échec et mat.
