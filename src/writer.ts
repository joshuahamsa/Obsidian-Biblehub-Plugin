import { TFile, Vault, normalizePath, Notice } from "obsidian";
import type { LexiconEntry, Recipe, SectionKey } from "./types";
import { safeFileName } from "./normalize";

export class Writer {
  constructor(private vault: Vault) {}

  buildTitle(entry: LexiconEntry, recipe: Recipe): string {
    const fill = (s: string) =>
      s
        .replaceAll("{{strong}}", entry.strong)
        .replaceAll("{{lemma}}", entry.lemma ?? "")
        .replaceAll("{{transliteration}}", entry.transliteration ?? "")
        .replaceAll("{{short_definition}}", "");

    return safeFileName(fill(recipe.noteTitlePattern)).trim();
  }

  filePath(title: string, recipe: Recipe): string {
    const folder = recipe.rootFolder.replace(/^\/+|\/+$/g, "");
    return normalizePath(`${folder}/${title}.md`);
  }

  async ensureFolder(recipe: Recipe) {
    const folder = normalizePath(recipe.rootFolder.replace(/^\/+|\/+$/g, ""));
    if (!(await this.vault.adapter.exists(folder))) {
      await this.vault.createFolder(folder);
    }
  }

  async upsert(entry: LexiconEntry, recipe: Recipe, renameOnUpdate: boolean): Promise<{ file: TFile; created: boolean }> {
    await this.ensureFolder(recipe);
    const title = this.buildTitle(entry, recipe);
    const path = this.filePath(title, recipe);

    const existing = this.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      const updated = await this.mergeIntoFile(existing, entry, recipe);
      if (renameOnUpdate) {
        // optional: attempt to rename if title changed (we're already at that path)
        // (If you want "rename existing regardless of current name", you'll need a strong->file index.)
      }
      return { file: existing, created: false };
    }

    const content = this.renderNew(entry, recipe);
    console.log("[BibleHub] Creating lexicon note:", path);
    new Notice(`[BibleHub] Creating lexicon note: ${path}`);
    const file = await this.vault.create(path, content);
    return { file, created: true };
  }

  private renderNew(entry: LexiconEntry, recipe: Recipe): string {
    const now = new Date().toISOString().slice(0, 10);

    const links_see_also = entry.links.see_also.map((id) => `[[${id}]]`);
    const relatedStrongTitles = (entry as any).relatedStrongTitles as Array<{id:string,title:string}> | undefined;
    const links_related = relatedStrongTitles ? relatedStrongTitles.map((r) => `[[${r.title}|${r.id}]]`) : entry.links.related_strongs.map((id) => `[[${id}]]`);
    const links_topical = entry.links.topical.map((id) => `[[${id}]]`);
    const links_scripture = entry.links.scripture.map((r) => `[[${scriptureLinkPath(recipe, r)}|${r.display}]]`);

    const yaml = [
      "---",
      `type: lexicon/strongs`,
      `lang: ${entry.lang}`,
      `strong: ${entry.strong}`,
      "",
      `lemma: ${entry.lemma ?? ""}`,
      `transliteration: ${entry.transliteration ?? ""}`,
      `pronunciation: ${entry.pronunciation ?? ""}`,
      `phonetic: ${entry.phonetic ?? ""}`,
      `part_of_speech: ${entry.part_of_speech ?? ""}`,
      "",
      `aliases:`,
      `  - ${entry.strong}`,
      ...(entry.transliteration ? [`  - ${entry.transliteration}`] : []),
      "",
      `source_primary: ${entry.source_primary}`,
      `source_alt:`,
      ...entry.source_alt.map((u) => `  - ${u}`),
      "",
      `imported_at: ${now}`,
      `import_recipe: ${recipe.id}`,
      "",
      `sections_included:`,
      ...recipe.includeSections.map((s) => `  - ${s}`),
      "",
      `links_see_also:`,
      ...links_see_also.map((l) => `  - "${l}"`),
      `links_related_strongs:`,
      ...links_related.map((l) => `  - "${l}"`),
      `links_topical:`,
      ...links_topical.map((l) => `  - "${l}"`),
      `links_scripture:`,
      ...links_scripture.map((l) => `  - "${l}"`),
      "",
      `crawl_depth: ${recipe.maxDepth}`,
      `crawl_root: ${entry.strong}`,
      "---",
      ""
    ].join("\n");

    const titleLine = `# ${entry.strong} — ${entry.lemma ?? ""} (${entry.transliteration ?? ""})`.trim();

    const blocks = { ...entry.blocks };
    if (recipe.linkTypes.includes("scripture") && links_scripture.length) {
      for (const key of Object.keys(blocks) as Array<keyof typeof blocks>) {
        if (blocks[key]) blocks[key] = linkifyScriptureRefs(blocks[key]!, entry.links.scripture);
      }
    }

    const sectionTitles: Record<SectionKey, string> = {
      lexical_summary: "Lexical Summary",
      strongs_definition: "Strong's Definition",
      helps: "HELPS Word-studies",
      thayers: "Thayer's Lexicon",
      forms_transliterations: "Forms & Transliterations",
      englishmans_concordance: "Englishman's Concordance",
      concordance: "Concordance",
      topical_lexicon: "Topical Lexicon"
    };

    const sectionOrder: SectionKey[] = [
      "lexical_summary",
      "strongs_definition",
      "helps",
      "thayers",
      "forms_transliterations",
      "englishmans_concordance",
      "concordance",
      "topical_lexicon"
    ];

    const sections = sectionOrder
      .filter((k) => recipe.includeSections.includes(k))
      .flatMap((k) => renderSection(sectionTitles[k], k, blocks[k]));

    const body = [
      titleLine,
      "",
      `> **Part of Speech:** ${entry.part_of_speech ?? ""}  `,
      `> **Pronunciation:** ${entry.pronunciation ?? ""}  `,
      `> **Primary source:** ${entry.source_primary}`,
      "",
      "---",
      "",
      ...sections,
      "",
      "---",
      "",
      "## Outbound Links",
      "",
      "**See also (direct Strong's cross-refs):**  ",
      links_see_also.join(", "),
      "",
      "**Related Strong's (lexical / semantic):**  ",
      links_related.join(", "),
      "",
      "**Topical connections:**  ",
      links_topical.join(", "),
      "",
      "**Scripture references:**  ",
      recipe.linkTypes.includes("scripture") ? links_scripture.join(", ") : "",
      ""
    ].join("\n");

    return yaml + body;
  }

  /**
   * Merges imported sections into existing file by replacing only blocks marked:
   * <!-- imported: section_key -->
   * For this draft we keep it simple: if marker exists, replace until next heading/marker.
   */
  private async mergeIntoFile(file: TFile, entry: LexiconEntry, recipe: Recipe): Promise<void> {
    const original = await this.vault.read(file);
    let text = original;

    for (const section of recipe.includeSections) {
      const replacement = entry.blocks[section] ?? "";
      text = replaceImportedBlock(text, section, replacement);
    }

    // NOTE: We are not rewriting YAML in this draft.
    // Next step is to parse YAML and update properties deterministically.
    await this.vault.modify(file, text);
  }
}

function renderSection(title: string, key: SectionKey, content?: string): string[] {
  const block = (content ?? "").trim();
  return [
    `## ${title}`,
    `<!-- imported: ${key} -->`,
    block || "",
    "",
    "---",
    ""
  ];
}

function replaceImportedBlock(doc: string, key: string, replacement: string): string {
  const marker = `<!-- imported: ${key} -->`;
  const idx = doc.indexOf(marker);
  if (idx < 0) return doc; // marker not present, skip in v1
  const afterMarker = idx + marker.length;

  // Find next section heading (## ) or next imported marker
  const rest = doc.slice(afterMarker);
  const nextHeading = rest.search(/\n##\s+/);
  const nextMarker = rest.indexOf("\n<!-- imported:");
  let endRel = -1;

  if (nextHeading >= 0 && nextMarker >= 0) endRel = Math.min(nextHeading, nextMarker);
  else if (nextHeading >= 0) endRel = nextHeading;
  else if (nextMarker >= 0) endRel = nextMarker;
  else endRel = rest.length;

  const end = afterMarker + endRel;
  return doc.slice(0, afterMarker) + "\n" + (replacement.trim() ? replacement.trim() + "\n" : "\n") + doc.slice(end);
}
function linkifyScriptureRefs(text: string, refs: Array<{ display: string }>): string {
  let out = text;
  for (const r of refs) {
    if (!r.display) continue;
    const escaped = r.display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "g"), `[[${r.display}]]`);
  }
  return out;
}


function scriptureLinkPath(recipe: Recipe, ref: ScriptureRef): string {
  const book = ref.slug.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const folder = recipe.scriptureRootFolder.replace(/^\/+|\/+$/g, "");
  return `${folder}/${book}/${ref.chapter}-${ref.verse}`;
}
