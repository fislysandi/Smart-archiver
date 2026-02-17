import {
  App,
  FuzzySuggestModal,
  getAllTags,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath
} from "obsidian";

interface SmartArchiverSettings {
  templateFolder: string;
  archiveFolder: string;
  archiveFileNamePattern: string;
  includeOriginalContent: boolean;
  processedSourceFolder: string;
  processedTag: string;
}

const DEFAULT_SETTINGS: SmartArchiverSettings = {
  templateFolder: "Templates/Archive",
  archiveFolder: "Archive",
  archiveFileNamePattern: "{{date}} - {{title}}",
  includeOriginalContent: true,
  processedSourceFolder: "Archive/Processed",
  processedTag: "archived"
};

type ArchiveTemplate = {
  file: TFile;
  content: string;
};

type RenderContext = {
  sourceFile: TFile;
  sourceContent: string;
  includeOriginalContent: boolean;
  frontmatter: FrontmatterFields;
};

type FrontmatterFields = {
  project: string;
  status: string;
  due: string;
  tags: string;
};

class TemplateSuggestModal extends FuzzySuggestModal<ArchiveTemplate> {
  private readonly templates: ArchiveTemplate[];
  private readonly onChoose: (template: ArchiveTemplate) => Promise<void>;

  constructor(app: App, templates: ArchiveTemplate[], onChoose: (template: ArchiveTemplate) => Promise<void>) {
    super(app);
    this.templates = templates;
    this.onChoose = onChoose;
    this.setPlaceholder("Select archive template...");
  }

  getItems(): ArchiveTemplate[] {
    return this.templates;
  }

  getItemText(item: ArchiveTemplate): string {
    return item.file.basename;
  }

  onChooseItem(item: ArchiveTemplate): void {
    void this.onChoose(item);
  }
}

export default class SmartArchiverPlugin extends Plugin {
  settings: SmartArchiverSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "archive-active-note-with-template",
      name: "Archive active note with template",
      callback: () => {
        void this.archiveActiveNote();
      }
    });

    this.addCommand({
      id: "archive-move-and-tag-active-note",
      name: "Archive active note, then tag and move source",
      callback: () => {
        void this.archiveActiveNote({ moveAndTagSource: true });
      }
    });

    this.addSettingTab(new SmartArchiverSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(loaded as Partial<SmartArchiverSettings>) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async archiveActiveNote(options?: { moveAndTagSource: boolean }): Promise<void> {
    const sourceFile = this.app.workspace.getActiveFile();
    if (!sourceFile) {
      new Notice("No active note to archive.");
      return;
    }

    const templates = await this.readTemplates();
    if (templates.length === 0) {
      new Notice("No templates found in the configured template folder.");
      return;
    }

    const modal = new TemplateSuggestModal(this.app, templates, async (template) => {
      await this.createArchiveFromTemplate(sourceFile, template, Boolean(options?.moveAndTagSource));
    });
    modal.open();
  }

  private async readTemplates(): Promise<ArchiveTemplate[]> {
    const templateFolder = normalizePath(this.settings.templateFolder);
    const templates = this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(`${templateFolder}/`));

    const result: ArchiveTemplate[] = [];
    for (const file of templates) {
      const content = await this.app.vault.read(file);
      result.push({ file, content });
    }
    return result;
  }

  private async createArchiveFromTemplate(
    sourceFile: TFile,
    template: ArchiveTemplate,
    moveAndTagSource: boolean
  ): Promise<void> {
    const sourceContent = await this.app.vault.read(sourceFile);
    const frontmatter = extractFrontmatterFields(this.app, sourceFile);
    const renderContext: RenderContext = {
      sourceFile,
      sourceContent,
      includeOriginalContent: this.settings.includeOriginalContent,
      frontmatter
    };

    const archiveContent = renderTemplate(template.content, renderContext);
    const archiveFolder = normalizePath(this.settings.archiveFolder);
    await this.ensureFolderExists(archiveFolder);

    const fileName = renderFileName(this.settings.archiveFileNamePattern, sourceFile);
    const archivePath = await this.nextAvailablePath(`${archiveFolder}/${fileName}.md`);
    const created = await this.app.vault.create(archivePath, archiveContent);

    if (moveAndTagSource) {
      await this.applyArchivedTag(sourceFile);
      const movedPath = await this.moveSourceNote(sourceFile);
      new Notice(`Archived: ${created.path} | Source moved: ${movedPath}`);
      return;
    }

    new Notice(`Archived: ${created.path}`);
  }

  private async moveSourceNote(sourceFile: TFile): Promise<string> {
    const targetFolder = normalizePath(this.settings.processedSourceFolder);
    await this.ensureFolderExists(targetFolder);

    const targetPath = await this.nextAvailablePath(`${targetFolder}/${sourceFile.basename}.md`);
    await this.app.fileManager.renameFile(sourceFile, targetPath);
    return targetPath;
  }

  private async applyArchivedTag(sourceFile: TFile): Promise<void> {
    const normalizedTag = normalizeTag(this.settings.processedTag);
    if (!normalizedTag) {
      return;
    }

    await this.app.fileManager.processFrontMatter(sourceFile, (frontmatter) => {
      const tags = coerceTags(frontmatter.tags);
      if (!tags.includes(normalizedTag)) {
        frontmatter.tags = [...tags, normalizedTag];
      }
    });
  }

  private async ensureFolderExists(path: string): Promise<void> {
    const normalized = normalizePath(path);
    if (normalized === "." || this.app.vault.getFolderByPath(normalized)) {
      return;
    }

    const segments = normalized.split("/");
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!this.app.vault.getFolderByPath(currentPath)) {
        await this.app.vault.createFolder(currentPath);
      }
    }
  }

  private async nextAvailablePath(path: string): Promise<string> {
    let candidate = normalizePath(path);
    let index = 1;

    while (this.app.vault.getAbstractFileByPath(candidate)) {
      const base = candidate.replace(/\.md$/, "");
      candidate = `${base} (${index}).md`;
      index += 1;
    }

    return candidate;
  }
}

class SmartArchiverSettingsTab extends PluginSettingTab {
  private readonly plugin: SmartArchiverPlugin;

  constructor(app: App, plugin: SmartArchiverPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Template folder")
      .setDesc("Folder containing Markdown templates used for archive generation.")
      .addText((text) =>
        text
          .setPlaceholder("Templates/Archive")
          .setValue(this.plugin.settings.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.templateFolder = normalizePath(value.trim() || DEFAULT_SETTINGS.templateFolder);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Archive folder")
      .setDesc("Destination folder for generated archive notes.")
      .addText((text) =>
        text
          .setPlaceholder("Archive")
          .setValue(this.plugin.settings.archiveFolder)
          .onChange(async (value) => {
            this.plugin.settings.archiveFolder = normalizePath(value.trim() || DEFAULT_SETTINGS.archiveFolder);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Archive file name pattern")
      .setDesc("Use {{date}}, {{datetime}}, and {{title}} placeholders.")
      .addText((text) =>
        text
          .setPlaceholder("{{date}} - {{title}}")
          .setValue(this.plugin.settings.archiveFileNamePattern)
          .onChange(async (value) => {
            this.plugin.settings.archiveFileNamePattern = value.trim() || DEFAULT_SETTINGS.archiveFileNamePattern;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include original content")
      .setDesc("Inject source note body into {{content}} placeholder when available.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeOriginalContent).onChange(async (value) => {
          this.plugin.settings.includeOriginalContent = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Processed source folder")
      .setDesc("Destination used by archive+move command for the original source note.")
      .addText((text) =>
        text
          .setPlaceholder("Archive/Processed")
          .setValue(this.plugin.settings.processedSourceFolder)
          .onChange(async (value) => {
            this.plugin.settings.processedSourceFolder =
              normalizePath(value.trim() || DEFAULT_SETTINGS.processedSourceFolder);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Processed tag")
      .setDesc("Tag applied by archive+move command (without #).")
      .addText((text) =>
        text
          .setPlaceholder("archived")
          .setValue(this.plugin.settings.processedTag)
          .onChange(async (value) => {
            this.plugin.settings.processedTag = value.trim() || DEFAULT_SETTINGS.processedTag;
            await this.plugin.saveSettings();
          })
      );
  }
}

function renderTemplate(templateText: string, context: RenderContext): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const datetime = now.toISOString();

  const replacements: Record<string, string> = {
    "{{date}}": date,
    "{{datetime}}": datetime,
    "{{title}}": context.sourceFile.basename,
    "{{path}}": context.sourceFile.path,
    "{{link}}": `[[${context.sourceFile.path}|${context.sourceFile.basename}]]`,
    "{{content}}": context.includeOriginalContent ? context.sourceContent : "",
    "{{project}}": context.frontmatter.project,
    "{{status}}": context.frontmatter.status,
    "{{due}}": context.frontmatter.due,
    "{{tags}}": context.frontmatter.tags
  };

  return Object.entries(replacements).reduce((output, [key, value]) => {
    return output.split(key).join(value);
  }, templateText);
}

function renderFileName(pattern: string, sourceFile: TFile): string {
  const now = new Date();
  const replacements: Record<string, string> = {
    "{{date}}": now.toISOString().slice(0, 10),
    "{{datetime}}": now.toISOString().replace(/[:.]/g, "-"),
    "{{title}}": sourceFile.basename
  };

  const interpolated = Object.entries(replacements).reduce((output, [key, value]) => {
    return output.split(key).join(value);
  }, pattern);

  return sanitizeFileName(interpolated || sourceFile.basename);
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFrontmatterFields(app: App, sourceFile: TFile): FrontmatterFields {
  const cache = app.metadataCache.getFileCache(sourceFile);
  const frontmatter = cache?.frontmatter;
  if (!frontmatter) {
    return { project: "", status: "", due: "", tags: "" };
  }

  const project = coerceString(frontmatter.project);
  const status = coerceString(frontmatter.status);
  const due = coerceString(frontmatter.due);
  const frontmatterTags = coerceTags(frontmatter.tags);
  const inlineTagValues = getAllTags(cache ?? {}) ?? [];
  const inlineTags = inlineTagValues.map((tag) => tag.replace(/^#/, ""));
  const tags = Array.from(new Set([...frontmatterTags, ...inlineTags])).join(", ");

  return {
    project,
    status,
    due,
    tags
  };
}

function coerceString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return "";
}

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeTag(coerceString(item)))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => normalizeTag(item))
      .filter((item): item is string => Boolean(item));
  }
  return [];
}

function normalizeTag(tag: string): string {
  const trimmed = tag.trim().replace(/^#/, "");
  return trimmed;
}
