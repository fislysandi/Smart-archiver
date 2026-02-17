# Obsidian Addon Best Practices

## Purpose
Build Obsidian plugins that are safe, maintainable, and aligned with official plugin guidance.

## Standards
- Keep plugin metadata clean: concise name/description, appropriate `minAppVersion`, clear IDs.
- Clean up resources in lifecycle hooks; avoid retaining stale references between unload/load cycles.
- Use Obsidian APIs (`Vault`, `FileManager`, editor APIs) over low-level adapter access where possible.
- Normalize user-defined paths (`normalizePath`) before reading/writing vault files.
- Avoid default command hotkeys; expose explicit commands and clear settings instead.
- Use Obsidian UI patterns (`PluginSettingTab`, `Setting`, `Notice`, suggest modals) for consistency.
- Avoid unsafe HTML operations; prefer plain text or safe rendering.
- Keep styling minimal and theme-compatible (use Obsidian variables, avoid hardcoded aggressive colors).

## Workflow
- Scaffold with TypeScript + esbuild and keep build output deterministic.
- Test in a real vault with community plugin dev mode enabled.
- Verify desktop/mobile compatibility when `isDesktopOnly` is false.

## References
- Obsidian developer docs: plugin build flow, API reference, plugin/release guidelines.
- Community plugin quality checklists and lint guidance.
