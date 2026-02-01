import { normalizePath, Vault } from "obsidian";
import type { ScriptureRef } from "./types";
import { safeFileName } from "./normalize";
import { Fetcher } from "./fetcher";

export function slugToBookName(slug: string): string {
  const words = slug.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ");
}

export function makeScriptureRefFromSlug(slug: string, chapter: number, verse: number): ScriptureRef {
  const book = slugToBookName(slug);
  const display = `${book} ${chapter}:${verse}`;
  const interlinearUrl = `https://biblehub.com/interlinear/${slug}/${chapter}-${verse}.htm`;
  const nasbUrl = `https://biblehub.com/nasb/${slug}/${chapter}-${verse}.htm`;
  return { slug, chapter, verse, display, interlinearUrl, nasbUrl };
}

export function scriptureNotePath(rootFolder: string, ref: ScriptureRef): string {
  const book = safeFileName(slugToBookName(ref.slug));
  const folder = rootFolder.replace(/^\/+|\/+$/g, "");
  return normalizePath(`${folder}/${book}/${ref.chapter}-${ref.verse}.md`);
}

export function scriptureAliases(ref: ScriptureRef): string[] {
  const book = slugToBookName(ref.slug);
  const full = `${book} ${ref.chapter}:${ref.verse}`;
  const abbr = bookAbbrev(book);
  const abbrSpaced = abbr ? `${abbr} ${ref.chapter}:${ref.verse}` : "";
  const abbrCompact = abbr ? `${abbr.replace(/\s+/g, "")} ${ref.chapter}:${ref.verse}`.replace(/\s+/g, "") : "";

  return Array.from(new Set([full, abbrSpaced, abbrCompact].filter(Boolean)));
}

function bookAbbrev(book: string): string {
  const parts = book.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 3);
  if (/^\d+$/.test(parts[0])) {
    const rest = parts[1] ?? "";
    return `${parts[0]} ${rest.slice(0, 3)}`.trim();
  }
  return parts[0].slice(0, 3);
}

export async function ensureScriptureNote(
  vault: Vault,
  fetcher: Fetcher,
  rootFolder: string,
  ref: ScriptureRef,
  relatedStrongLinks: string[]
): Promise<void> {
  const path = scriptureNotePath(rootFolder, ref);
  const existing = vault.getAbstractFileByPath(path);
  if (existing) return;

  const folder = path.split("/").slice(0, -1).join("/");
  if (!(await vault.adapter.exists(folder))) {
    await vault.createFolder(folder);
  }

  const html = await fetcher.get(ref.nasbUrl, true);
  const text = extractNasbText(html) || "";

  const aliases = scriptureAliases(ref).map((a) => `  - "${a}"`);

  const yaml = [
    "---",
    "type: scripture/verse",
    `reference: ${ref.display}`,
    `book: ${slugToBookName(ref.slug)}`,
    `chapter: ${ref.chapter}`,
    `verse: ${ref.verse}`,
    "aliases:",
    ...aliases,
    `source_nasb: ${ref.nasbUrl}`,
    `source_interlinear: ${ref.interlinearUrl}`,
    "related_strongs:",
    ...relatedStrongLinks.map((l) => `  - "${l}"`),
    "---",
    ""
  ].join("\n");

  const body = [
    `# ${ref.display}`,
    "",
    text.trim(),
    ""
  ].join("\n");

  await vault.create(path, yaml + body);
}

function extractNasbText(html: string): string {
  // Find the NASB 1995 section and capture the verse text that follows it
  const re = /NASB 1995<\/a><\/span><br \/>([\s\S]*?)(?:<span class="versiontext">|<span class="p">)/i;
  const m = html.match(re);
  if (!m) return "";
  return stripHtml(m[1]).replace(/\s+/g, " ").trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
