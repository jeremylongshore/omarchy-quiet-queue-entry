#!/bin/sh
# Exercise the same native-DND helper path as the panel's 25-minute button.
# The renderer runs this against an isolated real Omarchy shell and HOME.
set -eu

helper="${PLUGIN_DIR:?}/bin/quiet-queue"
command -v omarchy-shell >/dev/null 2>&1
test -x "$helper"

initial="$("$helper" --scan)"
printf 'quiet-queue e2e initial: %s\n' "$initial" >&2
printf '%s\n' "$initial" | jq -e '
  .known == true and .silenced == false and .owned == false and .until == 0
' >/dev/null

started="$("$helper" --start 1500)"
printf 'quiet-queue e2e started: %s\n' "$started" >&2
printf '%s\n' "$started" | jq -e '
  .known == true and .silenced == true and .owned == true and
  (.until > .now) and ((.until - .now) >= 1490) and ((.until - .now) <= 1500)
' >/dev/null
until_at="$(printf '%s\n' "$started" | jq -r '.until')"

# An unreadable Do Not Disturb state must change nothing. Shadow omarchy-shell
# with a stub that fails the way a shell that is not ready does, and scan an
# owned session on the real shell: the session must be reported unknown, kept,
# and still owned once the real shell answers again.
stubs="$(mktemp -d)"
trap 'rm -rf "$stubs"' EXIT
printf '#!/bin/sh\necho "omarchy-shell is not ready" >&2\nexit 1\n' > "$stubs/omarchy-shell"
chmod +x "$stubs/omarchy-shell"
blind="$(PATH="$stubs:$PATH" "$helper" --scan)"
printf 'quiet-queue e2e unreadable: %s\n' "$blind" >&2
printf '%s\n' "$blind" | jq -e --argjson until "$until_at" '
  .known == false and .silenced == null and .owned == true and .until == $until
' >/dev/null

rescanned="$("$helper" --scan)"
printf 'quiet-queue e2e rescanned: %s\n' "$rescanned" >&2
printf '%s\n' "$rescanned" | jq -e --argjson until "$until_at" '
  .known == true and .silenced == true and .owned == true and
  .until == $until and (.until > .now) and ((.until - .now) > 0)
' >/dev/null
