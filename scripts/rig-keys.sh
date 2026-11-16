#!/usr/bin/env bash
# Prove on the rig that the shipped panel works from the keyboard, with real
# keystrokes (wtype) into the real Omarchy shell under headless sway:
#
#   owned    Enter and Space activate the selected row exactly once, and Enter
#            with no cursor does nothing.
#   unknown  With Do Not Disturb unreadable, the panel reports it and no key
#            starts or ends anything.
#
# Each scenario runs scripts/rig-render.sh against a scratch copy of the tree
# whose helper logs every non-scan call before running the real one, and whose
# pre-capture hook is e2e/keys-<scenario>.sh. The scratch copy is deleted; the
# screenshots land in OUT_DIR (default reports/rig-keys). Run it under the shared
# rig lock. Rig only: it needs ssh access to the rig and ImageMagick.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/reports/rig-keys}"
mkdir -p "$OUT"

run_scenario() {
  local scenario="$1" scratch status=0
  scratch="$(mktemp -d)"
  ( cd "$ROOT" && git ls-files -z --cached --others --exclude-standard \
      | tar --null -T - -cf - ) | tar -xf - -C "$scratch"
  mv "$scratch/bin/quiet-queue" "$scratch/bin/quiet-queue.real"
  cat > "$scratch/bin/quiet-queue" <<'WRAP'
#!/bin/sh
# Scratch-only wrapper: log each action (not the polls), then run the real helper.
case "${1:---scan}" in --scan) ;; *) printf '%s\n' "$*" >> "$HOME/helper-calls.log" ;; esac
exec "$(dirname "$0")/quiet-queue.real" "$@"
WRAP
  chmod +x "$scratch/bin/quiet-queue"
  cp "$scratch/e2e/keys-$scenario.sh" "$scratch/e2e/rig-before-capture.sh"
  if [[ "$scenario" == unknown ]]; then
    mkdir -p "$scratch/e2e/bin"
    printf '#!/bin/sh\necho "omarchy-shell is not ready" >&2\nexit 1\n' > "$scratch/e2e/bin/omarchy-shell"
    chmod +x "$scratch/e2e/bin/omarchy-shell"
  fi
  echo "rig-keys: scenario $scenario"
  bash "$ROOT/scripts/rig-render.sh" "$scratch" "$OUT/$scenario.png" || status=$?
  rm -rf "$scratch"
  return "$status"
}

run_scenario owned
run_scenario unknown
echo "rig-keys: both scenarios passed; screenshots in $OUT"
