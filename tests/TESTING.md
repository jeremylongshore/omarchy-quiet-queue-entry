# Testing Context: Quiet Queue
<!-- TESTING.md schema v1. Policy defaults were scaffolded by implement-tests for engineer review. -->
<!-- markdownlint-disable MD007 MD032 -->

## Classification (policy)

Repo type: frontend + cli (Omarchy QML plugin with a stock-Perl DND helper)
Primary language(s): QML, JavaScript ES5, Perl, Bash
Applicable layers: L1, L2, L3, L4-integration, L5-security, L5-a11y, L6-smoke, L6-e2e, L6-visual, L7-UAT
Waived layers: L4-contract (no network or API), L4-migration (no schema migration), L5-perf (bounded local state), L5-chaos (single-user desktop plugin)
Compliance overlay: none

## Thresholds (policy, hash-pinned)

coverage.line: 95
coverage.branch: 90
coverage.function: 95
mutation.kill_rate: 90
crap.prod_max: 30
crap.test_max: 15
crap.project_avg: 10
flaky.tolerance: 0/3runs
test.complexity_ceiling: 15
personas.flow_coverage_min: 100
journeys.step_coverage_min: 100

## Installed gates (observational)

L0: @intentsolutions/audit-harness 1.4.0
L1: pre-push gate lane + GitHub Actions test/gates workflows
L2: Perl syntax, ShellCheck, actionlint, vendored Omarchy gates, gitleaks, npm audit
L3: node:test + c8 coverage + Stryker mutation + three-run race stability. CRAP is NOT enforced: under audit-harness 1.4.0 crap-score scores zero functions for root-level Model.js and still reports PASS (jeremylongshore/intent-audit-harness#248); the crap.* thresholds above are policy that nothing measures yet
L4-integration: real helper subprocess and native-DND mock fixtures, including planted failing, malformed, oversized and hanging DND reads
L5-security: concurrent ownership, rollback, expiry, same-UID final/temp/parent racers, symlink/FIFO/oversize/path-confinement regressions
L5-a11y: QML accessibility names, roles, press actions and bounded plain-text assertions
L6-smoke: stock Perl startup and QML-to-Model contract tests
L6-e2e: Buzz Omarchy validator, qmllint, live shell load, native DND transition, an unreadable-read scan against the real shell, IPC open, and screenshot; scripts/rig-keys.sh drives real keystrokes (wtype) into the real shell and counts the helper's own actions
L6-visual: 1280x720 active-session render from the real shell, inspected and bound to its SHA-256 in .render-proof.json
L7-UAT: primary focus and hostile-state journeys mapped in tests/JOURNEYS.md

## Frameworks (observational)

unit: node:test
coverage: c8 12
mutation: Stryker 10
policy: @intentsolutions/audit-harness 1.4.0
e2e: scripts/rig-verify.sh + scripts/rig-render.sh on intent-ops-buzz/omarchy-rig

## Last audit (observational)

date: 2026-08-29 (grade not re-run for 0.2.2; the numbers below are from the 0.2.2 run)
grade: A (96/100) from the 2026-08-29 audit-tests run under harness 1.3.1
auditor: audit-tests + omarchy-ship
p0_gaps: 0 after implementation
p1_gaps: 0 after QML-specific adaptation
p2_gaps: 1 (crap-score is not enforced, see TEST_AUDIT.md)

## Traceability (observational, updated by audit-tests)

rtm.total_requirements: 11
rtm.by_moscow:
  must: 9 (9 covered, 0 uncovered)
  should: 2 (2 covered, 0 uncovered)
  could: 0
  wont: 0
rtm.orphaned_tests: 0
personas.declared: 2
personas.under_threshold: 0
journeys.declared: 2
journeys.fully_covered: 2
journeys.partial: 0

## Rig identity for the committed receipts (observational)

rig: intent-ops-buzz/omarchy-rig container, headless sway (no live Hyprland compositor)
omarchy: 74de10479d3bf7aa7865408e33219064cfe45432
qt: qt6-base 6.12.0-5 (qmllint 6.12.0)
quickshell: 0.3.2
evidence: .rig-proof.json and .render-proof.json record the Omarchy sha, Qt and Quickshell versions

## 0.2.2 run (observational)

tests: 57 pass (npm test), Model.js 100% statements, branches, functions and lines
race: three consecutive helper-suite runs, 27 tests each, zero failures
mutation: 97.12% (236 killed, 7 survived, all equivalent), break threshold 90
osv-scanner: no advisories on package-lock.json
gate lane: 13 of 13 gates, vendored from contributing-clanker f79d8c7

## Hash manifest

version: 1
last_init: 2026-08-29 during the requested test-system implementation
protected_files:
  - tests/TESTING.md policy sections
  - tests/RTM.md MoSCoW tiers
  - tests/JOURNEYS.md criticality
  - stryker.config.json thresholds
