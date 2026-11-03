#!/usr/bin/env bash
# Hues installer.
#   curl -fsSL https://raw.githubusercontent.com/victorabuchi/hues/main/install.sh | bash
set -euo pipefail

REPO="https://github.com/victorabuchi/hues.git"
DEST="${HUES_HOME:-$HOME/.local/share/hues}"
BIN_DIR="${HUES_BIN:-$HOME/.local/bin}"

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
dim()  { printf '\033[2m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }

[ "$(uname -s)" = "Darwin" ] || { red "Hues is macOS only (it writes macOS-specific theme formats)."; exit 1; }

command -v git >/dev/null || { red "git is required."; exit 1; }
command -v node >/dev/null || { red "Node 18+ is required: https://nodejs.org"; exit 1; }

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 18 ] || { red "Node 18+ is required (found $(node -v))."; exit 1; }

bold "Installing Hues"
if [ -d "$DEST/.git" ]; then
  dim "updating $DEST"
  git -C "$DEST" pull --ff-only --quiet
else
  dim "cloning into $DEST"
  mkdir -p "$(dirname "$DEST")"
  git clone --depth 1 --quiet "$REPO" "$DEST"
fi

mkdir -p "$BIN_DIR"
ln -sf "$DEST/src/cli.js" "$BIN_DIR/hues"
chmod +x "$DEST/src/cli.js"

echo
bold "Installed."
dim "  $BIN_DIR/hues -> $DEST/src/cli.js"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo
    bold "Add this to your shell profile:"
    echo "  export PATH=\"\$PATH:$BIN_DIR\""
    ;;
esac

cat <<'MSG'

Try it:
  hues targets            what it can theme on this machine
  hues check dracula      contrast audit of the palette
  hues apply dracula      theme everything (records a restore point first)

Undo:
  hues reset              put EVERYTHING back the way it was
MSG
