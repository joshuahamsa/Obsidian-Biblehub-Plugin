import { App, PluginSettingTab, Setting } from "obsidian";
import type { Recipe, SectionKey, EdgeType, LinkType } from "./types";
import type BibleHubLexiconImporter from "./main";

export interface PluginSettings {
  recipe: Recipe;
}

const DEFAULT_RECIPE: Recipe = {
  id: "word-study-web:v1",
  includeSections: [
    "lexical_summary",
    "strongs_definition",
    "helps",
    "thayers",
    "forms_transliterations",
    "englishmans_concordance",
    "topical_lexicon"
  ],
  followEdges: ["see_also", "related_strongs"],
  linkTypes: ["strongs", "scripture"],
  linkGreekHebrew: true,
  lemmaAliasMode: "primary",
  maxDepth: 2,
  maxNodes: 100,
  rateLimitMs: 1000,
  skipExisting: true,
  rootFolder: "Lexicon/Strongs",
  scriptureRootFolder: "Scripture",
  noteTitlePattern: "{{strong}} — {{lemma}} ({{transliteration}})"
};

export const DEFAULT_SETTINGS: PluginSettings = {
  recipe: DEFAULT_RECIPE
};

export class SettingsTab extends PluginSettingTab {
  plugin: BibleHubLexiconImporter;

  constructor(app: App, plugin: BibleHubLexiconImporter) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Root folder")
      .setDesc("Where Strong's notes are created/updated.")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.recipe.rootFolder)
          .onChange(async (v) => {
            this.plugin.settings.recipe.rootFolder = v.trim() || "Lexicon/Strongs";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Scripture folder")
      .setDesc("Where scripture notes are created/updated.")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.recipe.scriptureRootFolder)
          .onChange(async (v) => {
            this.plugin.settings.recipe.scriptureRootFolder = v.trim() || "Scripture";
            await this.plugin.saveSettings();
          })
      );

    const sectionLabels: Record<SectionKey, string> = {
      lexical_summary: "Lexical Summary",
      strongs_definition: "Strong's Definition",
      helps: "HELPS Word-studies",
      thayers: "Thayer's Lexicon",
      forms_transliterations: "Forms & Transliterations",
      englishmans_concordance: "Englishman's Concordance",
      concordance: "Concordance",
      topical_lexicon: "Topical Lexicon"
    };

    const linkLabels: Record<LinkType, string> = {
      strongs: "Strong's number links",
      scripture: "Scripture reference links"
    };

    new Setting(containerEl)
      .setName("Include sections")
      .setDesc("Choose which sections to include in generated notes.");

    for (const key of Object.keys(sectionLabels) as SectionKey[]) {
      new Setting(containerEl)
        .setName(sectionLabels[key])
        .addToggle((tg) =>
          tg
            .setValue(this.plugin.settings.recipe.includeSections.includes(key))
            .onChange(async (v) => {
              const set = new Set(this.plugin.settings.recipe.includeSections);
              v ? set.add(key) : set.delete(key);
              this.plugin.settings.recipe.includeSections = Array.from(set);
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Link types")
      .setDesc("Choose which link types to generate.");

    for (const key of Object.keys(linkLabels) as LinkType[]) {
      new Setting(containerEl)
        .setName(linkLabels[key])
        .addToggle((tg) =>
          tg
            .setValue(this.plugin.settings.recipe.linkTypes.includes(key))
            .onChange(async (v) => {
              const set = new Set(this.plugin.settings.recipe.linkTypes);
              v ? set.add(key) : set.delete(key);
              this.plugin.settings.recipe.linkTypes = Array.from(set);
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Auto-link Greek/Hebrew terms")
      .setDesc("Link Greek/Hebrew tokens to Strong's notes (creates placeholders if missing). Turn off Skip existing if you want alias updates.")
      .addToggle((tg) =>
        tg
          .setValue(this.plugin.settings.recipe.linkGreekHebrew)
          .onChange(async (v) => {
            this.plugin.settings.recipe.linkGreekHebrew = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Lemma aliases")
      .setDesc("Choose alias behavior for lemmas when auto-linking.")
      .addDropdown((dd) =>
        dd
          .addOption("primary", "Primary lemma only")
          .addOption("all", "All lemmas found in note")
          .setValue(this.plugin.settings.recipe.lemmaAliasMode)
          .onChange(async (v) => {
            this.plugin.settings.recipe.lemmaAliasMode = v as "primary" | "all";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max depth")
      .setDesc("Crawl depth for typed edges (BFS).")
      .addSlider((s) =>
        s
          .setLimits(0, 5, 1)
          .setValue(this.plugin.settings.recipe.maxDepth)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.recipe.maxDepth = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max nodes")
      .setDesc("Maximum nodes created/updated in a single run.")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.recipe.maxNodes))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) {
              this.plugin.settings.recipe.maxNodes = Math.max(1, n);
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Rate limit (ms)")
      .setDesc("Delay between requests to be polite to BibleHub.")
      .addText((t) =>
        t
          .setValue(String(this.plugin.settings.recipe.rateLimitMs))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            if (!Number.isNaN(n)) {
              this.plugin.settings.recipe.rateLimitMs = Math.max(0, n);
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Skip existing notes")
      .setDesc("If ON, existing Strong's notes will not be refetched/rewritten (only linked).")
      .addToggle((tg) =>
        tg
          .setValue(this.plugin.settings.recipe.skipExisting)
          .onChange(async (v) => {
            this.plugin.settings.recipe.skipExisting = v;
            await this.plugin.saveSettings();
          })
      );

  }
}