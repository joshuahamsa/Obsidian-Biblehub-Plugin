import { App, Modal, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PluginSettings, SettingsTab } from "./settings";
import { normalizeStrongId, langFromStrong } from "./normalize";
import { Fetcher } from "./fetcher";
import { Writer } from "./writer";
import { Crawler } from "./crawler";

export default class BibleHubLexiconImporter extends Plugin {
  settings: PluginSettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // Migrate older settings to include related_strongs crawling + new options
    const fe = new Set(this.settings.recipe.followEdges ?? []);
    fe.add("see_also");
    fe.add("related_strongs");
    this.settings.recipe.followEdges = Array.from(fe);

    if (!this.settings.recipe.linkTypes || this.settings.recipe.linkTypes.length === 0) {
      this.settings.recipe.linkTypes = ["strongs", "scripture"];
    }

    if (this.settings.recipe.linkGreekHebrew === undefined) {
      this.settings.recipe.linkGreekHebrew = true;
    }

    if (!this.settings.recipe.lemmaAliasMode) {
      this.settings.recipe.lemmaAliasMode = "primary";
    }

    if (!this.settings.recipe.scriptureRootFolder) {
      this.settings.recipe.scriptureRootFolder = "Scripture";
    }

    // Remove short_definition from title pattern if still present
    if (this.settings.recipe.noteTitlePattern?.includes("{{short_definition}}")) {
      this.settings.recipe.noteTitlePattern = "{{strong}} — {{lemma}} ({{transliteration}})";
    }

    this.addSettingTab(new SettingsTab(this.app, this));

    const fetcher = new Fetcher(this.settings.recipe.rateLimitMs);
    const writer = new Writer(this.app.vault);
    const crawler = new Crawler(this.app.vault, fetcher, writer);

    this.addCommand({
      id: "import-strongs-graph",
      name: "Import Strong's as graph (BibleHub)",
      callback: async () => {
        const seed = await this.getSeedFromSelectionOrPrompt();
        if (!seed) return;

        const strong = this.normalizeSeedToStrong(seed);
        if (!strong) {
          new Notice("Could not parse Strong's ID. Try G2198, H1623, or a BibleHub Strong's URL.");
          return;
        }

        const recipe = this.settings.recipe;

        new Notice(`Importing ${strong} (depth ${recipe.maxDepth}, max ${recipe.maxNodes} nodes)...`);

        const result = await crawler.run(strong, recipe, false);

        const msg = [
          `Done.`,
          `Created: ${result.created}`,
          `Updated: ${result.updated}`,
          `Skipped: ${result.skipped}`,
          result.errors.length ? `Errors: ${result.errors.length}` : ""
        ].filter(Boolean).join(" ");

        new Notice(msg);
      }
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async getSeedFromSelectionOrPrompt(): Promise<string | null> {
    const view = this.app.workspace.getActiveViewOfType<any>(Object as any);
    // If active view has an editor
    const editor = (view as any)?.editor;
    const selection = editor?.getSelection?.()?.trim();

    if (selection) return selection;

    // Otherwise prompt
    return await new SeedModal(this.app).openAndGetValue();
  }

  private normalizeSeedToStrong(seed: string): string | null {
    const s = seed.trim();

    // If URL contains /strongs/greek/2198.htm or /strongs/hebrew/1623.htm
    const m = s.match(/biblehub\.com\/strongs\/(greek|hebrew)\/(\d+)\.htm/i);
    if (m) {
      const prefix = m[1].toLowerCase() === "greek" ? "G" : "H";
      return prefix + String(parseInt(m[2], 10));
    }

    // If URL contains /greek/2198.htm or /hebrew/1623.htm
    const m2 = s.match(/biblehub\.com\/(greek|hebrew)\/(\d+)\.htm/i);
    if (m2) {
      const prefix = m2[1].toLowerCase() === "greek" ? "G" : "H";
      return prefix + String(parseInt(m2[2], 10));
    }

    // Strong's ID
    const m3 = normalizeStrongId(s);
    if (m3) return m3;

    // Bare number? Assume Greek (you could make this a setting)
    const n = s.match(/\b(\d{1,5})\b/);
    if (n) return normalizeStrongId(n[1], "greek");

    return null;
  }
}

class SeedModal extends Modal {
  private value: string = "";
  private resolved = false;
  private resolver?: (v: string | null) => void;

  async openAndGetValue(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.open();
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Import BibleHub Strong's" });
    contentEl.createEl("p", {
      text: "Enter a Strong's ID (G2198 / H1623) or a BibleHub Strong's URL."
    });

    const input = contentEl.createEl("input", { type: "text" });
    input.style.width = "100%";
    input.placeholder = "e.g., G2198";
    input.addEventListener("input", () => (this.value = input.value));

    const buttons = contentEl.createDiv({ cls: "modal-button-container" });
    const ok = buttons.createEl("button", { text: "Import" });
    const cancel = buttons.createEl("button", { text: "Cancel" });

    ok.addEventListener("click", () => {
      this.resolved = true;
      this.close();
      this.resolver?.(this.value.trim() || null);
    });

    cancel.addEventListener("click", () => {
      this.resolved = true;
      this.close();
      this.resolver?.(null);
    });

    setTimeout(() => input.focus(), 50);
  }

  onClose() {
    if (!this.resolved) this.resolver?.(null);
    this.contentEl.empty();
  }
}