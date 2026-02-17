# Changelog

## [0.2.4] - 2026-02-17

### Fixed
- Prevented duplicate date segments in archive filenames by auto-skipping suffix when the base name already contains today's date.

## [0.2.3] - 2026-02-17

### Added
- New commands to archive incomplete (`[ ]`) and cancelled (`[-]`) tasks from the active note.
- Generic task placeholders for task-archive templates: `{{task_items}}` and `{{task_count}}`.

### Changed
- Archive filename suffix is now configurable in plugin settings.
- Task-archive commands now append to existing archive files and always clear matched tasks from the source note.

## [0.2.2] - 2026-02-17

### Fixed
- Completed-task archive command now archives only extracted `[x]` task lines instead of full note content.
- Archive creation now always sets `archive-time` frontmatter to current ISO datetime.

## [0.2.1] - 2026-02-17

### Added
- New command to archive completed tasks (`[x]`) from the active note.
- New template placeholders: `{{completed_tasks}}` and `{{completed_tasks_count}}`.
- New starter template: `templates/archive-completed-tasks.md`.

### Changed
- Added setting to optionally remove archived completed tasks from the source note.

## [0.2.0] - 2026-02-17

### Added
- New command to archive active note, then tag and move the source note.
- Frontmatter-aware template placeholders: `{{project}}`, `{{status}}`, `{{due}}`, and `{{tags}}`.
- Release automation workflows for CI and tagged GitHub releases with plugin assets.

### Changed
- Default template now includes frontmatter-derived fields.
- Plugin settings now include processed source folder and processed tag.
