# Smart Archiver

Smart Archiver is an Obsidian plugin that archives GTD and project notes into flexible archive files using selectable Markdown templates.

## Features

- Archive the active note with a template picker command.
- Archive active note, then auto-tag and move the source note.
- Archive completed checklist items (`[x]`) from the active note.
- Use placeholder-based templates for consistent archive structure.
- Configure archive destination and filename patterns.
- Include or skip original note content in archive output.

## Installation (development)

```bash
npm install
npm run build
```

Then copy `manifest.json`, `main.js`, and optionally `styles.css` into:

`<YourVault>/.obsidian/plugins/smart-archiver/`

Enable **Smart Archiver** in Obsidian community plugins settings.

## Quick Start

1. Create a template folder in your vault, for example: `Templates/Archive`.
2. Add one or more `.md` template files.
3. Run command: **Archive active note with template**.
4. Pick a template and Smart Archiver creates a new archive note.

To archive and then process the source note automatically, run:

- **Archive active note, then tag and move source**

To archive only completed tasks from the active note, run:

- **Archive completed tasks from active note**

## Template Placeholders

- `{{date}}` - ISO date (`YYYY-MM-DD`)
- `{{datetime}}` - ISO datetime
- `{{title}}` - source note title
- `{{path}}` - source note full path
- `{{link}}` - wikilink to source note
- `{{content}}` - source note content (if enabled)
- `{{project}}` - `project` value from source note frontmatter
- `{{status}}` - `status` value from source note frontmatter
- `{{due}}` - `due` value from source note frontmatter
- `{{tags}}` - merged frontmatter/inline tags from source note
- `{{completed_tasks}}` - completed markdown tasks extracted from source note
- `{{completed_tasks_count}}` - number of extracted completed tasks

Example template:

```markdown
# Archive: {{title}}

- Archived on: {{datetime}}
- Source: {{link}}

## Notes

{{content}}
```

## Settings

- **Template folder**: where templates are loaded from.
- **Archive folder**: where generated archive notes are created.
- **Archive file name pattern**: supports `{{date}}`, `{{datetime}}`, `{{title}}`.
- **Include original content**: controls `{{content}}` replacement.
- **Processed source folder**: target folder used by archive+move command.
- **Processed tag**: tag added by archive+move command.
- **Remove completed tasks after archiving**: if enabled, `[x]` tasks are removed from source note after successful archive creation.

## BRAT Testing

1. Install BRAT plugin in your vault.
2. In BRAT: **Add Beta plugin**.
3. Use this repo URL: `https://github.com/fislysandi/Smart-archiver`.
4. Select the latest release and enable Smart Archiver.

Releases include `main.js`, `manifest.json`, and `styles.css` assets.

## Archive Metadata

On every archive file creation, Smart Archiver sets/updates frontmatter property:

- `archive-time`: ISO datetime of archive creation

## Development

```bash
npm run dev
```

## License

MIT
