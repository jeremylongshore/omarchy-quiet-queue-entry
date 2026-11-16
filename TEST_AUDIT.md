# Test Audit: Quiet Queue

Date: 2026-11-16 (version 0.2.2)
Classification: frontend + cli Omarchy plugin
Audit harness: 1.4.0
Registry: `sha256:ffbc75700fb5eb501cb47f1e4038f47ab95ae1fba534b38095e1fe7820c80ed1`

## Result

Grade: A (96/100) from the 2026-08-29 audit-tests run under harness 1.3.1. That
grade has not been re-run for 0.2.2. The evidence below is from the 0.2.2 run.

The 2026-08-29 audit found concurrency ownership, failure-path, accessibility,
E2E, smoke, and presentation gaps, and the suite exercises each of them. The
web-contract heuristic is not applicable because Quiet Queue has no API or
network boundary. audit-harness reports accessibility as advisory because its
presence detector recognizes browser axe packages, not QML roles.

0.2.2 adds the one path the earlier audit did not plant: a Do Not Disturb read
that fails, hangs, or returns something other than `on` or `off`. That state is
unknown, and the tests assert that nothing changes while it is.

## Layer coverage

| Layer | Status | Evidence |
|---|---|---|
| L1 hooks and CI | Implemented | pre-push gates; exact npm test, race, mutation, audit, and ShellCheck in Actions |
| L2 static | Implemented | Perl compile, ShellCheck, actionlint, osv-scanner, gitleaks, vendored gates |
| L3 unit | Implemented | node:test, c8, Stryker, race stability. CRAP is not enforced, see below |
| L4 integration | Implemented | real helper subprocesses and native-DND mock fixtures, including planted failing, malformed, oversized and hanging reads |
| L5 system/security/a11y | Implemented | ownership races, failure rollback, path confinement, FIFO, bounds, unknown-state refusal, QML accessibility contract |
| L6 smoke/E2E/visual | Implemented on the rig | `npm run test:e2e` validates, loads, starts a session, scans an unreadable read against the real shell, and captures; `scripts/rig-keys.sh` drives real keystrokes |
| L7 acceptance | Mapped | both critical journeys are mapped; the preview approval is bound to its SHA-256 in `.render-proof.json` |

## Gaps

P0: 0
P1: 0
P2: 1. `crap-score` is not enforced. Under audit-harness 1.4.0 it scores zero
functions for root-level `Model.js` and still reports PASS
(jeremylongshore/intent-audit-harness#248). The `crap.*` thresholds in
`tests/TESTING.md` are policy that nothing measures yet.

## Traceability

Eleven requirements are mapped: nine MUST and two SHOULD. All are covered. Both
personas and both critical journeys have 100% mapped coverage. No tests are
orphaned.

## Evidence from the 0.2.2 run

- 57 tests pass (`npm test`), with 100% Model.js statements, branches,
  functions, and lines
- Three consecutive helper-suite passes (27 tests each) with zero failures
- 97.12% mutation score (236 killed, 7 survived, all equivalent mutants), with a
  90% blocking floor
- osv-scanner reports no advisories on `package-lock.json`
- Vendored gate lane synced to contributing-clanker f79d8c7, 13 of 13 gates
- `omarchy-plugin-validate` exit 0 and qmllint 0 errors on the rig; render
  loaded with no QML warnings
- Rig: Omarchy `74de10479d3bf7aa7865408e33219064cfe45432`, qt6-base 6.12.0-5
  (qmllint 6.12.0), Quickshell 0.3.2, headless sway. No Hyprland compositor ran.
  Both receipts record the Omarchy sha and the Qt and Quickshell versions.

## What this does not prove

- Behaviour under a live Hyprland compositor. The rig runs headless sway.
- A real shell restart in the middle of an owned session. The unreadable read is
  planted with a shadowing stub, on the real shell, and the failure the audit
  reproduced is covered by the helper tests.
- That Omarchy never answers `off` before it has loaded its saved Do Not Disturb
  state at startup (`Service.qml` defaults `doNotDisturb` to false until
  `quiet.json` loads). Quiet Queue cannot tell that read from a real `off`.
