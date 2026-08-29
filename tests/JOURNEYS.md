# User Journeys: Quiet Queue
<!-- Managed by audit-tests. Journey criticality is hash-pinned after review. -->

## Journey: take one bounded focus session

Personas: keyboard-first focus worker
Trigger: operator opens Quiet Queue from the Omarchy bar
Critical: true
Linked RTM: REQ-QQ-001, REQ-QQ-004, REQ-QQ-006, REQ-QQ-007, REQ-QQ-008

| # | Step | Layer | Test file | Status |
|---|---|---|---|---|
| 1 | Plugin loads in the stock shell | L6 | e2e/buzz.sh | Covered |
| 2 | Panel opens through IPC with named actions | L5, L6 | tests/a11y.test.js, e2e/buzz.sh | Covered |
| 3 | Start transitions native DND and records one owner | L3, L4 | tests/helper.test.js | Covered |
| 4 | Concurrent starts retain that ownership and extend safely | L4, L5 | tests/helper.test.js | Covered |
| 5 | Panel renders the active countdown and explicit end action | L3, L6 | tests/model.test.js, e2e/buzz.sh | Covered |
| 6 | End restores notifications only when the session is still owned | L3, L4 | tests/helper.test.js | Covered |

Coverage: 6/6 steps (100%)

## Journey: recover safely without stealing native DND

Personas: safety-conscious Omarchy operator
Trigger: external DND changes, a failed transition, expiry, or hostile state-path replacement
Critical: true
Linked RTM: REQ-QQ-002, REQ-QQ-003, REQ-QQ-005

| # | Step | Layer | Test file | Status |
|---|---|---|---|---|
| 1 | Preserve DND that was already enabled outside Quiet Queue | L3, L4 | tests/helper.test.js | Covered |
| 2 | Revoke stale ownership after an external DND-off | L3, L4 | tests/helper.test.js | Covered |
| 3 | Roll back a failed native transition or state publication | L4, L5 | tests/helper.test.js | Covered |
| 4 | Traverse every state component and publish through retained descriptors | L5 | tests/helper.test.js | Covered |
| 5 | Preserve unrelated victims during final, temp, and parent racing | L5 | tests/helper.test.js, tests/fixtures | Covered |
| 6 | Continue to run with stock Omarchy dependencies only | L2, L6 | tests/smoke.test.js, e2e/buzz.sh | Covered |

Coverage: 6/6 steps (100%)
