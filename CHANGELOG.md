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
