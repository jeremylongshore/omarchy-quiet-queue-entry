# Changelog

Notable changes to this plugin.

Entries are derived from this repository's commit history, so every line
corresponds to a real change. The format follows Keep a Changelog and the
project uses Semantic Versioning.

Regenerate after a release with:

```bash
scripts/gen-changelog.sh . "<Plugin Name>" "<version>"
```

The generator normalises em and en dashes, because a changelog is shipped prose
and gate c28 refuses them.

## [Unreleased]

Nothing yet.

## [0.2.2] - 2026-11-16

### Fixed

- Treat an unreadable Do Not Disturb state as unknown, never as off. The helper
  used to read a failing `omarchy-shell` as "off", so one failed scan (for
  example while the shell restarts) deleted the session record of a session it
  owned, and the next scan then refused to turn that silence off. The read now
  trusts only an exit status of 0 with exactly `on` or `off`, is bounded by a
  timeout (8 seconds, `QUIET_QUEUE_DND_TIMEOUT` for tests), and an unknown
  state changes nothing: scans keep ownership and never end an expired session,
  `--start` and `--end` are refused with exit status 3, and the panel reports
  `DND STATE UNKNOWN` and offers no action. A start whose transition cannot be
  verified restores the "off" it read.
- Stop claiming that silenced notifications are kept and never discarded. On
  Omarchy 74de104 Do Not Disturb drops transient and `notify-send`
  notifications, records most others in history, and still shows critical
  `notify-send` alerts, action toasts and verification codes. The manifest
  (both 500-character fields), README, SECURITY.md, panel, banner and
  marketplace contract now say what Omarchy does. "NOTIFICATIONS QUEUED" is now
  "NOTIFICATIONS SILENCED".

### Added

- Enter and Space activate the selected row, as in the first-party panels. Arrow
  keys show and move a cursor over the 25 minute, 50 minute and end rows, and
  `activateRequested` is the only activation wired so Enter runs once.
- A README runtime-dependencies section: the helper is Perl (core modules only),
  which stock Omarchy has through the base `git` package.
- `scripts/rig-keys.sh`: real keystrokes into the real Omarchy shell on the rig,
  counting the helper's own actions, plus the unreadable-state panel.
- Rig receipts now record the Omarchy sha, the Qt version qmllint belongs to, and
  the Quickshell version. A passing render hook's output is printed.

### Changed

- "Immediately" in the README is now "within 5 seconds", the real poll interval.
- Refresh the lockfile so the six dev-only advisories (brace-expansion, fast-uri,
  glob, minimatch, qs, zod) resolve to fixed versions; osv-scanner reports none.
- Sync the vendored gate lane to canonical f79d8c7, add `.stryker-tmp/` to
  `.gitignore`, and add a markdownlint config shared with the sibling plugins.

## [0.2.1] - 2026-11-15

### Fixed

- Read native Do Not Disturb with the `isDnd` IPC call. Omarchy removed the
  old `dndState` alias on 2026-10-22, so on current Omarchy the helper always
  read DND as off and a start failed with "native DND transition was not
  applied".
- Qualify Omarchy's palette as `Commons.Color`, as the shell contract requires
  now that Qt 6.12 has its own `Color` type. A contract test fails on any bare
  `Color.` in the shipped QML.

### Changed

- Seed the rig render's isolated home with the current-theme state a real
  Omarchy install has, so first-party shell plugins on current Omarchy do not
  log warnings the render would read as plugin warnings.
- Bump `actions/setup-node` to 7.1.0 and the MiniMax review action to the
  fork's current main (`cfb2c72`), with the audit harness re-pinned.

## [0.2.0] - 2026-08-29

### Added

- Active-session panel hierarchy with ownership, countdown, start, and end controls.
- Production-parity Buzz E2E, QML accessibility, stock-runtime smoke, mutation, and adversarial race coverage.

### Fixed

- Preserve DND ownership across repeated and concurrent starts.
- Revoke stale ownership after an external DND change.
- Roll back native DND when state publication fails.
- Bind state traversal, publication, and cleanup to verified filesystem descriptors.

## [0.1.0] - 2026-08-25

### Added

- Initial owner-aware Quiet Queue plugin.
