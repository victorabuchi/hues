#!/usr/bin/env bash
# Wraps the generated web extension in a Safari app, builds, signs and installs it.
#
# Safari cannot load an unpacked extension folder the way Chromium browsers can.
# A Safari web extension has to be embedded in a native macOS app, signed, and
# enabled by the user. This script does every part of that except the final
# consent, which Apple deliberately reserves for the user.
#
# usage: scripts/build-safari-app.sh [palette] [team-id]
set -euo pipefail

PALETTE="${1:-dracula}"
TEAM="${2:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/build/$PALETTE/safari"
OUT="$ROOT/build/safari-app"
APP_NAME="Hues for the Web"
BUNDLE_ID="com.$(id -un).hues.web"

[ -d "$SRC" ] || { echo "no built extension at $SRC -- run: hues build $PALETTE" >&2; exit 1; }

if [ -z "$TEAM" ]; then
  TEAM=$(security find-identity -v -p codesigning 2>/dev/null \
    | sed -n 's/.*Developer ID Application: .*(\([A-Z0-9]*\)).*/\1/p' | head -1)
fi
[ -n "$TEAM" ] || { echo "no signing team found; pass one as the second argument" >&2; exit 1; }

rm -rf "$OUT"; mkdir -p "$OUT"
xcrun safari-web-extension-converter "$SRC" \
  --macos-only --no-prompt --no-open \
  --project-location "$OUT" \
  --app-name "$APP_NAME" \
  --bundle-identifier "$BUNDLE_ID" >/dev/null

PROJ_DIR="$OUT/$APP_NAME"
PBX=$(find "$PROJ_DIR" -name 'project.xcproj' -o -name 'project.pbxproj' | head -1)
[ -n "$PBX" ] || { echo "could not find the generated project file" >&2; exit 1; }

# The converter derives the *app's* bundle id from the app name while using the
# --bundle-identifier we passed for the *extension*. When the two disagree the
# build fails with "Embedded binary's bundle identifier is not prefixed with the
# parent app's bundle identifier". Force the app back onto our id.
APP_ID_WRONG=$(grep -oE "com\.[A-Za-z0-9._-]*" "$PBX" | grep -v "\.Extension$" | grep -v "^$BUNDLE_ID$" | sort -u | head -1 || true)
if [ -n "$APP_ID_WRONG" ]; then
  sed -i '' "s/${APP_ID_WRONG//./\\.}/$BUNDLE_ID/g" "$PBX"
  echo "patched app bundle id: $APP_ID_WRONG -> $BUNDLE_ID"
fi

cd "$PROJ_DIR"
xcodebuild -project "$APP_NAME.xcodeproj" -scheme "$APP_NAME" \
  -configuration Release -derivedDataPath ./dd \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic build >/dev/null

BUILT="dd/Build/Products/Release/$APP_NAME.app"
rm -rf "/Applications/$APP_NAME.app"
cp -R "$BUILT" /Applications/
open "/Applications/$APP_NAME.app"

cat <<MSG

installed /Applications/$APP_NAME.app

Last step, which cannot be scripted -- Safari requires your consent:
  1. Safari -> Settings -> Advanced -> tick "Show features for web developers"
  2. Safari -> Develop -> Allow Unsigned Extensions
     (needed because this is a development-signed build, not a notarised one)
  3. Safari -> Settings -> Extensions -> tick "$APP_NAME"
MSG
