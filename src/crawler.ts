import type { CrawlResult, Recipe, LexiconEntry, EdgeType } from "./types";
import { strongsUrl } from "./normalize";
import { Fetcher } from "./fetcher";
import { parseEntryFromStrongsPage } from "./parser";
import { Writer } from "./writer";
import { ensureScriptureNote } from "./scripture";
import { Vault, TFile, normalizePath } from "obsidian";

type QueueItem = { strong: string; depth: number };

export class Crawler {
  constructor(
    private vault: Vault,
    private fetcher: Fetcher,
    private writer: Writer
  ) {}

  async run(rootStrong: string, recipe: Recipe, renameOnUpdate: boolean): Promise<CrawlResult> {
    this.fetcher.setRateLimit(recipe.rateLimitMs);

    const res: CrawlResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    const lemmaIndex = await this.buildLemmaIndex(recipe.rootFolder);
    const seen = new Set<string>();
    const q: QueueItem[] = [{ strong: rootStrong, depth: 0 }];

    let processed = 0;

    while (q.length > 0 && processed < recipe.maxNodes) {
      const { strong, depth } = q.shift()!;
      if (seen.has(strong)) continue;
      seen.add(strong);

      const exists = this.findExistingByStrongIdFallback(strong, recipe);
      if (exists && recipe.skipExisting) {
        res.skipped++;
        processed++;
        continue;
      }

      try {
        const url = strongsUrl(strong);
        const html = await this.fetcher.get(url, true);

        let entry: LexiconEntry = parseEntryFromStrongsPage(strong, url, html);

        // update lemma index with current entry
        if (entry.lemma) lemmaIndex.set(entry.lemma, entry.strong);

        if (recipe.linkGreekHebrew) {
          entry = await this.applyLemmaLinks(entry, lemmaIndex, recipe);
        }

        const up = await this.writer.upsert(entry, recipe, renameOnUpdate);
        if (up.created) res.created++;
        else res.updated++;

        if (recipe.linkTypes.includes("scripture") && entry.links.scripture.length) {
          const related = Array.from(new Set([entry.strong, ...entry.links.related_strongs]))
            .map((id) => `[[${id}]]`);
          for (const ref of entry.links.scripture) {
            await ensureScriptureNote(this.vault, this.fetcher, recipe.scriptureRootFolder, ref, related);
          }
        }

        // Enqueue typed edges
        if (depth < recipe.maxDepth) {
          for (const next of this.nextNodes(entry, recipe.followEdges)) {
            if (!seen.has(next)) q.push({ strong: next, depth: depth + 1 });
          }
        }

      } catch (e: any) {
        res.errors.push({ id: strong, error: e?.message ?? String(e) });
      }

      processed++;
    }

    return res;
  }

  private nextNodes(entry: LexiconEntry, edgeTypes: EdgeType[]): string[] {
    const out: string[] = [];
    for (const et of edgeTypes) {
      if (et === "see_also") out.push(...entry.links.see_also);
      if (et === "related_strongs") out.push(...entry.links.related_strongs);
      if (et === "topical") out.push(...entry.links.topical);
    }
    return Array.from(new Set(out));
  }

  private async buildLemmaIndex(rootFolder: string): Promise<Map<string, string>> {
    const folder = rootFolder.replace(/^\/+|\/+$/g, "");
    const files = this.vault.getMarkdownFiles().filter(f => f.path.startsWith(folder + "/"));
    const map = new Map<string, string>();
    for (const f of files) {
      const content = await this.vault.read(f);
      const mStrong = content.match(/^strong:\s*(G\d{1,5}|H\d{1,5})\s*$/m);
      const mLemma = content.match(/^lemma:\s*(.+)$/m);
      if (mStrong && mLemma) {
        const lemma = mLemma[1].trim();
        const strong = mStrong[1].trim();
        if (lemma) map.set(lemma, strong);
      }
    }
    return map;
  }

  private async applyLemmaLinks(entry: LexiconEntry, lemmaIndex: Map<string, string>, recipe: Recipe): Promise<LexiconEntry> {
    const blocks = { ...entry.blocks };
    const lemmasFound = new Set<string>();
    const tokens = extractGreekHebrewTokens(Object.values(blocks).join("\n"));
    for (const token of tokens) {
      const strong = lemmaIndex.get(token);
      if (!strong) continue;
      lemmasFound.add(token);
      // linkify token occurrences to [[token]] (alias should resolve)
      for (const k of Object.keys(blocks) as Array<keyof typeof blocks>) {
        if (!blocks[k]) continue;
        blocks[k] = replaceTokenWithLink(blocks[k]!, token, `[[${token}]]`);
      }
    }

    // add lemma aliases based on mode
    if (recipe.lemmaAliasMode === "all" && lemmasFound.size > 0) {
      for (const lemma of lemmasFound) {
        const strong = lemmaIndex.get(lemma);
        if (strong) await this.ensureAliasForStrong(strong, lemma, recipe);
      }
    } else if (entry.lemma) {
      await this.ensureAliasForStrong(entry.strong, entry.lemma, recipe);
    }

    return { ...entry, blocks };
  }

  private async ensureAliasForStrong(strong: string, lemma: string, recipe: Recipe): Promise<void> {
    const existing = this.findExistingByStrongIdFallback(strong, recipe);
    if (!existing) {
      const title = strong;
      const folder = recipe.rootFolder.replace(/^\/+|\/+$/g, "");
      if (!(await this.vault.adapter.exists(folder))) {
        await this.vault.createFolder(folder);
      }
      const path = normalizePath(`${folder}/${title}.md`);
      const yaml = [
        "---",
        `type: lexicon/strongs`,
        `strong: ${strong}`,
        `lemma: ${lemma}`,
        `aliases:`,
        `  - ${strong}`,
        `  - ${lemma}`,
        "---",
        "",
        `# ${strong}`,
        ""
      ].join("\n");
      await this.vault.create(path, yaml);
      return;
    }

    const text = await this.vault.read(existing);
    const updated = addAliasToFrontmatter(text, lemma, strong);
    if (updated !== text) await this.vault.modify(existing, updated);
  }
  /**
   * Draft fallback: checks if there is any note in the folder containing the strong ID in its filename.
   * Later you'll want an index (strong -> file path) by scanning YAML strong: fields.
   */
  private findExistingByStrongIdFallback(strong: string, recipe: Recipe): TFile | null {
    const folder = recipe.rootFolder.replace(/^\/+|\/+$/g, "");
    const files = this.vault.getMarkdownFiles().filter(f => f.path.startsWith(folder + "/"));
    const hit = files.find(f => f.basename.includes(strong));
    return hit ?? null;
  }
}

function extractGreekHebrewTokens(text: string): string[] {
  const tokens = new Set<string>();
  const greek = text.match(/[\p{Script=Greek}]+/gu) ?? [];
  const hebrew = text.match(/[\p{Script=Hebrew}]+/gu) ?? [];
  for (const t of [...greek, ...hebrew]) {
    if (t.length >= 2) tokens.add(t);
  }
  return Array.from(tokens);
}

function replaceTokenWithLink(text: string, token: string, link: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "g"), link);
}

function addAliasToFrontmatter(text: string, alias: string, strong: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return text;
  const fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);

  const aliasesMatch = fm.match(/\naliases:\n([\s\S]*?)(?=\n\w|\n---|$)/);
  if (!aliasesMatch) {
    const insert = `\naliases:\n  - ${strong}\n  - ${alias}\n`;
    return fm.replace("\n---", insert + "\n---") + body;
  }

  const aliasesBlock = aliasesMatch[1];
  if (aliasesBlock.includes(alias)) return text;

  const updatedBlock = aliasesBlock + `  - ${alias}\n`;
  const updatedFm = fm.replace(aliasesBlock, updatedBlock);
  return updatedFm + body;
}
