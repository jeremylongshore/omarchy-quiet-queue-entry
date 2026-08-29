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
