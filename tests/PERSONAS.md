# Personas: Quiet Queue
<!-- Managed by audit-tests. -->
<!-- markdownlint-disable MD007 MD032 -->

## Keyboard-first focus worker

Tier: local desktop user
Permissions: local plugin and native Omarchy notification mode
Key flows: open panel, start bounded quiet time, see ownership/countdown, end the session, drive every row from the keyboard
Test coverage:
  - open panel: e2e/buzz.sh
  - start and inspect a session: tests/helper.test.js and e2e/buzz.sh
  - end only owned DND: tests/helper.test.js
  - drive every row from the keyboard: tests/model.test.js and e2e/keys-owned.sh
Coverage: 4/4 flows (100%)

## Safety-conscious Omarchy operator

Tier: local desktop user
Permissions: local plugin, local state only
Key flows: preserve external DND, recover from failed transitions, resist hostile local state, stay safe when DND cannot be read
Test coverage:
  - preserve external DND: tests/helper.test.js
  - transition/publication rollback: tests/helper.test.js
  - hostile state handling: tests/helper.test.js and tests/fixtures
  - unreadable DND state: tests/helper.test.js and e2e/keys-unknown.sh
Coverage: 4/4 flows (100%)
