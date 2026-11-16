#!/bin/sh
# Rig only. With omarchy-shell shadowed by a stub that fails (scripts/rig-keys.sh
# puts it first on PATH), the panel must report the Do Not Disturb state as
# unknown and no key may start or end anything.
set -eu

helper="${PLUGIN_DIR:?}/bin/quiet-queue"
log="$HOME/helper-calls.log"
command -v wtype >/dev/null 2>&1 || { echo "keys: wtype is required" >&2; exit 1; }
: > "$log"

ipc() { qs -p "$OMARCHY_PATH/shell" ipc call "$MOD" "$1" >/dev/null; }
ipc open; sleep 6
wtype -s 1000 -k Down -s 800 -k Return -s 800 -k space -s 800 -k Down -s 800 -k Return; sleep 3
state="$("$helper" --scan)"
if [ -s "$log" ] || ! printf '%s\n' "$state" | jq -e '.known == false and .silenced == null' >/dev/null; then
  printf 'keys: FAIL unknown: actions=[%s] state=%s\n' "$(tr '\n' ';' < "$log")" "$state" >&2
  exit 1
fi
printf 'keys: ok unknown state offers no action: actions=[] state=%s\n' "$state" >&2
ipc close; sleep 2
