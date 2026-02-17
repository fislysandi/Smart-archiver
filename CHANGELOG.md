# Changelog

## [0.2.0] - 2026-02-17

### Added
- New command to archive active note, then tag and move the source note.
- Frontmatter-aware template placeholders: `{{project}}`, `{{status}}`, `{{due}}`, and `{{tags}}`.
- Release automation workflows for CI and tagged GitHub releases with plugin assets.

### Changed
- Default template now includes frontmatter-derived fields.
- Plugin settings now include processed source folder and processed tag.
