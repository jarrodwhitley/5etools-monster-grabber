#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
MANIFEST="$ROOT_DIR/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "manifest.json not found"
  exit 1
fi

VERSION="$(awk -F '"' '/"version"/ { print $4; exit }' "$MANIFEST")"
ZIP_NAME="5etools-monster-grabber-v${VERSION}.zip"
ZIP_PATH="$ARTIFACTS_DIR/$ZIP_NAME"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "dist/ not found. Run 'npm run build' first."
  exit 1
fi

mkdir -p "$ARTIFACTS_DIR"
rm -f "$ZIP_PATH"

cd "$DIST_DIR"
zip -r "$ZIP_PATH" \
  . \
  -x "*.DS_Store"

echo "Created $ZIP_PATH"
