#!/bin/sh
# Exercise the same native-DND helper path as the panel's 25-minute button.
# The renderer runs this against an isolated real Omarchy shell and HOME.
set -eu

helper="${PLUGIN_DIR:?}/bin/quiet-queue"
command -v omarchy-shell >/dev/null 2>&1
test -x "$helper"

initial="$($helper --scan)"
printf 'quiet-queue e2e initial: %s\n' "$initial" >&2
printf '%s\n' "$initial" | jq -e '
  .silenced == false and .owned == false and .until == 0
' >/dev/null

started="$($helper --start 1500)"
printf 'quiet-queue e2e started: %s\n' "$started" >&2
printf '%s\n' "$started" | jq -e '
  .silenced == true and .owned == true and
  (.until > .now) and ((.until - .now) >= 1490) and ((.until - .now) <= 1500)
' >/dev/null

rescanned="$($helper --scan)"
printf 'quiet-queue e2e rescanned: %s\n' "$rescanned" >&2
printf '%s\n' "$rescanned" | jq -e '
  .silenced == true and .owned == true and
  (.until > .now) and ((.until - .now) > 0)
' >/dev/null
