#!/usr/bin/env bash
# Sync open-license Lichess piece SVGs into frontend/public/pieces/
# Source: https://github.com/lichess-org/lila (see COPYING.md)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/frontend/public/pieces"
BASE="https://raw.githubusercontent.com/lichess-org/lila/master/public/piece"
PIECES=(wK wQ wR wB wN wP bK bQ bR bB bN bP)

# folder_on_disk:upstream_folder
SETS=(
  cburnett:cburnett
  merida:merida
  chessnut:chessnut
  letter:letter
  pirouetti:pirouetti
  pixel:pixel
  shapes:shapes
  rhosgfx:rhosgfx
  fantasy:fantasy
  spatial:spatial
  celtic:celtic
  kiwen-suwi:kiwen-suwi
  mpchess:mpchess
  firi:firi
  papercut:papercut
  totoy:totoy
)

mkdir -p "$DEST"

for entry in "${SETS[@]}"; do
  folder="${entry%%:*}"
  upstream="${entry##*:}"
  mkdir -p "$DEST/$folder"
  echo "==> $folder"
  for p in "${PIECES[@]}"; do
    curl -fsSL "$BASE/$upstream/$p.svg" -o "$DEST/$folder/$p.svg"
  done
done

# mono: upstream uses unprefixed K.svg…P.svg
echo "==> mono"
mkdir -p "$DEST/mono"
for p in K Q R B N P; do
  curl -fsSL "$BASE/mono/$p.svg" -o "$DEST/mono/$p.svg"
  cp "$DEST/mono/$p.svg" "$DEST/mono/w$p.svg"
  cp "$DEST/mono/$p.svg" "$DEST/mono/b$p.svg"
done

echo "Done. $(find "$DEST" -name '*.svg' | wc -l) SVG files."
