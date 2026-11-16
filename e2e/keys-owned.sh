#!/bin/sh
# Rig only. Drive the shipped panel with real keystrokes in the isolated Omarchy
# shell and prove, from a log of the helper's own invocations, that Enter and
# Space activate the selected row exactly once. scripts/rig-keys.sh installs this
# as the pre-capture hook of a scratch copy whose helper logs each action.
set -eu

helper="${PLUGIN_DIR:?}/bin/quiet-queue"
log="$HOME/helper-calls.log"
command -v wtype >/dev/null 2>&1 || { echo "keys: wtype is required" >&2; exit 1; }
: > "$log"

ipc() { qs -p "$OMARCHY_PATH/shell" ipc call "$MOD" "$1" >/dev/null; }
calls() { tr '\n' ';' < "$log"; }
check() {
  # check <label> <expected action log> <jq filter over the state>
  state="$("$helper" --scan)"
  if [ "$(calls)" != "$2" ] || ! printf '%s\n' "$state" | jq -e "$3" >/dev/null; then
    printf 'keys: FAIL %s: actions=[%s] expected=[%s] state=%s\n' "$1" "$(calls)" "$2" "$state" >&2
    exit 1
  fi
  printf 'keys: ok %s: actions=[%s] state=%s\n' "$1" "$(calls)" "$state" >&2
}

check "initial" "" '.known == true and .owned == false'
ipc open; sleep 5
# One wtype call per sequence: each call makes a fresh virtual keyboard, and the
# first key sent to a keyboard the client has not bound yet is lost.
wtype -s 1000 -k Return; sleep 3
check "Return with no cursor does nothing" "" '.owned == false and .silenced == false'
wtype -s 800 -k Down -s 800 -k Return; sleep 3
check "Down, Return starts 25 minutes once" "--start 1500;" '.owned == true and .silenced == true'
wtype -s 800 -k Down -s 600 -k Down -s 600 -k space; sleep 3
check "Down, Down, Space ends the session once" "--start 1500;--end;" '.owned == false and .silenced == false'
wtype -s 800 -k Up -s 600 -k Up -s 600 -k Return; sleep 3
check "Up, Up, Return starts 25 minutes again once" "--start 1500;--end;--start 1500;" '.owned == true and .silenced == true'
# Close the panel so the renderer's own toggle reopens it fresh for the capture.
ipc close; sleep 2
