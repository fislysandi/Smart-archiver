import {
  App,
  FuzzySuggestModal,
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
}

const DEFAULT_SETTINGS: SmartArchiverSettings = {
  templateFolder: "Templates/Archive",
  archiveFolder: "Archive",
  archiveFileNamePattern: "{{date}} - {{title}}",
  includeOriginalContent: true
};

type ArchiveTemplate = {
  file: TFile;
  content: string;
};

type RenderContext = {
  sourceFile: TFile;
  sourceContent: string;
  includeOriginalContent: boolean;
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

    this.addSettingTab(new SmartArchiverSettingsTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(loaded as Partial<SmartArchiverSettings>) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async archiveActiveNote(): Promise<void> {
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
      await this.createArchiveFromTemplate(sourceFile, template);
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

  private async createArchiveFromTemplate(sourceFile: TFile, template: ArchiveTemplate): Promise<void> {
    const sourceContent = await this.app.vault.read(sourceFile);
    const renderContext: RenderContext = {
      sourceFile,
      sourceContent,
      includeOriginalContent: this.settings.includeOriginalContent
    };

    const archiveContent = renderTemplate(template.content, renderContext);
    const archiveFolder = normalizePath(this.settings.archiveFolder);
    await this.ensureFolderExists(archiveFolder);

    const fileName = renderFileName(this.settings.archiveFileNamePattern, sourceFile);
    const archivePath = await this.nextAvailablePath(`${archiveFolder}/${fileName}.md`);
    const created = await this.app.vault.create(archivePath, archiveContent);

    new Notice(`Archived: ${created.path}`);
  }

  private async ensureFolderExists(path: string): Promise<void> {
    if (!this.app.vault.getFolderByPath(path)) {
      await this.app.vault.createFolder(path);
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
    "{{content}}": context.includeOriginalContent ? context.sourceContent : ""
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
