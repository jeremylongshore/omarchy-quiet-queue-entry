#!/usr/bin/env bash
# Acceptance lane: validate, lint, load, start native DND, open, and capture
# Quiet Queue in the shared production-parity Omarchy shell.
# RTM: REQ-QQ-007, REQ-QQ-008
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/rig-verify.sh" "$ROOT"
"$ROOT/scripts/rig-render.sh" "$ROOT" "$ROOT/preview.png"
test -s "$ROOT/preview.png"
