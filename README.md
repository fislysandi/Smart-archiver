# Smart Archiver

Smart Archiver is an Obsidian plugin that archives GTD and project notes into flexible archive files using selectable Markdown templates.

## Features

- Archive the active note with a template picker command.
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

## Template Placeholders

- `{{date}}` - ISO date (`YYYY-MM-DD`)
- `{{datetime}}` - ISO datetime
- `{{title}}` - source note title
- `{{path}}` - source note full path
- `{{link}}` - wikilink to source note
- `{{content}}` - source note content (if enabled)

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

## Development

```bash
npm run dev
```

## License

MIT
