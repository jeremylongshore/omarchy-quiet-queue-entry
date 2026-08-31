#!/usr/bin/env bash
# Acceptance lane: validate, lint, load, start native DND, open, and capture
# Quiet Queue in the shared production-parity Omarchy shell.
# RTM: REQ-QQ-007, REQ-QQ-008
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/rig-verify.sh" "$ROOT"
"$ROOT/scripts/rig-render.sh" "$ROOT" "$ROOT/preview.png"
test -s "$ROOT/preview.png"
jq -e '
  .dimensions == "1280 x 720" and
  .sourceDirty == false and
  .sourcePackageSha256 == .remotePackageSha256 and
  .visualInspection.status == "pending" and
  (.rawShellLogSha256 | test("^[a-f0-9]{64}$"))
' "$ROOT/.render-proof.json" >/dev/null
