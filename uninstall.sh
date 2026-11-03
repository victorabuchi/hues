#!/usr/bin/env bash
# Restores the machine, then removes Hues itself.
#   curl -fsSL https://raw.githubusercontent.com/victorabuchi/hues/main/uninstall.sh | bash
set -euo pipefail

DEST="${HUES_HOME:-$HOME/.local/share/hues}"
BIN_DIR="${HUES_BIN:-$HOME/.local/bin}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
dim()  { printf '\033[2m%s\033[0m\n' "$*"; }

bold "Restoring everything Hues changed"
if command -v hues >/dev/null; then
  hues reset --remove-app || dim "reset reported problems; continuing with removal"
elif [ -f "$DEST/src/cli.js" ]; then
  node "$DEST/src/cli.js" reset --remove-app || dim "reset reported problems; continuing"
else
  dim "Hues not found; skipping reset"
fi

echo
bold "Removing Hues"
rm -f "$BIN_DIR/hues"
rm -rf "$DEST"
dim "removed $DEST and $BIN_DIR/hues"

echo
dim "Kept: ~/.hues (baseline + restore points)."
dim "Delete it too with:  rm -rf ~/.hues"
