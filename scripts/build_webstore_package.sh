#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_DIR="$DIST_DIR/webstore-package"
ZIP_PATH="$DIST_DIR/sinan-webstore.zip"

echo "Building Chrome Web Store package..."

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

TRACKED_FILES="$(git -C "$ROOT_DIR" ls-files manifest.json src assets)"
if [[ -z "$TRACKED_FILES" ]]; then
  echo "No tracked extension files found." >&2
  exit 2
fi

while IFS= read -r relative_path; do
  mkdir -p "$PACKAGE_DIR/$(dirname "$relative_path")"
  cp "$ROOT_DIR/$relative_path" "$PACKAGE_DIR/$relative_path"
done <<< "$TRACKED_FILES"

"$ROOT_DIR/scripts/check_remote_hosted_code.sh" "$PACKAGE_DIR"

rm -f "$ZIP_PATH"
(
  cd "$PACKAGE_DIR"
  zip -qr "$ZIP_PATH" .
)

echo "Package ready: $ZIP_PATH"
