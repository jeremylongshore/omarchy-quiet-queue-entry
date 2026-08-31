# Requirements Traceability Matrix: Quiet Queue
<!-- Managed by audit-tests. MoSCoW decisions are hash-pinned after review. -->

| Req ID | MoSCoW | Source | Description | Layers | Test files | Status |
|---|---|---|---|---|---|---|
| REQ-QQ-001 | MUST | README.md | Start a bounded 25- or 50-minute native Omarchy quiet session | L3, L4 | tests/helper.test.js | Covered |
| REQ-QQ-002 | MUST | README.md | Never disable DND that Quiet Queue did not enable or still own | L3, L4, L5 | tests/helper.test.js | Covered |
| REQ-QQ-003 | MUST | Marketplace #2902 | Keep state private and resist symlink, FIFO, replacement, parent-path, and concurrency attacks | L3, L5 | tests/helper.test.js, tests/fixtures | Covered |
| REQ-QQ-004 | MUST | Panel.qml | Parse state fail-closed and render a bounded accurate status/countdown | L3, L5 | tests/model.test.js, tests/a11y.test.js | Covered |
| REQ-QQ-005 | MUST | manifest.json | Run on stock Omarchy without Node or Python at runtime | L2, L6 | tests/smoke.test.js, scripts/rig-verify.sh | Covered |
| REQ-QQ-006 | MUST | Panel.qml | Expose named button roles for start and end actions | L5, L6 | tests/a11y.test.js | Covered |
| REQ-QQ-007 | MUST | submission process | Validate, load, activate, open, and render in the production-parity Buzz shell | L6, L7 | e2e/buzz.sh | Pending live proof |
| REQ-QQ-008 | SHOULD | marketplace presentation | Show ownership, countdown, action hierarchy, and safe native-history behavior at a glance | L3, L6 | tests/model.test.js, tests/contract.test.js, e2e/buzz.sh | Pending hash-bound inspection |
