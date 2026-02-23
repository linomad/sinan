#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Target directory not found: $TARGET_DIR" >&2
  exit 2
fi

echo "Scanning for MV3 remote-hosted code risks in: $TARGET_DIR"

PATTERN='(<script[^>]+src=["'"'"'](https?:)?//)|((src|href)\s*=\s*["'"'"'](https?:)?//[^"'"'"']+\.(js|mjs|cjs)(\?[^"'"'"']*)?["'"'"'])|(importScripts\s*\(\s*["'"'"']https?://)|(import\s*\(\s*["'"'"']https?://)|((src|href)\s*=\s*["'"'"']https?://www\.googletagmanager\.com)|((src|href)\s*=\s*["'"'"']https?://hm\.baidu\.com)|((src|href)\s*=\s*["'"'"']https?://lf3-data\.volccdn\.com)|((src|href)\s*=\s*["'"'"']//statics\.moonshot\.cn)'

if rg -n -i --pcre2 "$PATTERN" "$TARGET_DIR" \
  -g '!**/.git/**' \
  -g '!**/.gemini-clipboard/**' \
  -g '*.html' -g '*.htm' -g '*.js' -g '*.mjs' -g '*.cjs' > /tmp/mv3_remote_code_hits.txt; then
  echo
  echo "Found potential remote-hosted code references:"
  cat /tmp/mv3_remote_code_hits.txt
  exit 1
fi

echo "No remote-hosted code patterns detected."
