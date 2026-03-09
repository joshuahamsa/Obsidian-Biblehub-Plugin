import { normalizePath, Vault, Notice, TFile } from "obsidian";
import type { ScriptureRef } from "./types";
import { safeFileName } from "./normalize";
import { Fetcher } from "./fetcher";
import type { InterlinearWord } from "./parser/interlinear";
import { parseInterlinearWords } from "./parser/interlinear";

export type RelatedStrongLink = { id: string; link: string };
const MORPHOLOGY_ROOT_FOLDER = "Lexicon/Morphology";

export function slugToBookName(slug: string): string {
  const words = slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ");
}

export function makeScriptureRefFromSlug(
  slug: string,
  chapter: number,
  verse: number
): ScriptureRef {
  const book = slugToBookName(slug);
  const display = `${book} ${chapter}:${verse}`;
  const interlinearUrl = `https://biblehub.com/interlinear/${slug}/${chapter}-${verse}.htm`;
  const nasbUrl = `https://biblehub.com/nasb/${slug}/${chapter}-${verse}.htm`;
  return { slug, chapter, verse, display, interlinearUrl, nasbUrl };
}

export function scriptureNotePath(
  rootFolder: string,
  ref: ScriptureRef
): string {
  const book = safeFileName(slugToBookName(ref.slug));
  const folder = rootFolder.replace(/^\/+|\/+$/g, "");
  return normalizePath(
    `${folder}/${book}/${book}-${ref.chapter}-${ref.verse}.md`
  );
}

export function scriptureAliases(ref: ScriptureRef): string[] {
  const book = slugToBookName(ref.slug);
  const full = `${book} ${ref.chapter}:${ref.verse}`;
  const abbr = bookAbbrev(book);
  const abbrSpaced = abbr ? `${abbr} ${ref.chapter}:${ref.verse}` : "";
  const abbrCompact = abbr
    ? `${abbr.replace(/\s+/g, "")} ${ref.chapter}:${ref.verse}`.replace(
        /\s+/g,
        ""
      )
    : "";

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
  relatedStrongs: RelatedStrongLink[],
  contextStrongIds: string[],
  preParsedInterlinearWords?: InterlinearWord[],
  linkMorphologyTags = true
): Promise<void> {
  const path = scriptureNotePath(rootFolder, ref);
  const existing = vault.getAbstractFileByPath(path);
  if (existing) return;

  const folder = path.split("/").slice(0, -1).join("/");
  await ensureFolderPath(vault, folder);

  const html = await fetcher.get(ref.nasbUrl, true);
  const text = extractNasbText(html) || "";
  const interlinearWords =
    preParsedInterlinearWords ??
    parseInterlinearWords(await fetcher.get(ref.interlinearUrl, true));
  const contextSet = new Set(contextStrongIds);
  const matchedWords = interlinearWords.filter((w) => contextSet.has(w.strong));
  if (linkMorphologyTags) {
    const tags = collectMorphologyTags(matchedWords);
    const definitions = collectMorphologyDefinitions(matchedWords);
    await ensureMorphologyNotes(vault, tags, definitions);
  }

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
    ...relatedStrongs.map((r) => `  - "${r.link}"`),
    "---",
    "",
  ].join("\n");

  const body = [
    `# ${ref.display}`,
    "",
    text.trim(),
    "",
    ...renderInterlinearContext(
      interlinearWords,
      relatedStrongs,
      contextStrongIds,
      linkMorphologyTags
    ),
    "",
  ].join("\n");

  console.log("[BibleHub] Creating scripture note:", path);
  new Notice(`[BibleHub] Creating scripture note: ${path}`);
  await vault.create(path, yaml + body);
}

function renderInterlinearContext(
  words: ReturnType<typeof parseInterlinearWords>,
  relatedStrongs: RelatedStrongLink[],
  contextStrongIds: string[],
  linkMorphologyTags: boolean
): string[] {
  const relatedById = new Map(relatedStrongs.map((r) => [r.id, r.link]));
  const contextSet = new Set(contextStrongIds);
  const matched = words.filter((w) => contextSet.has(w.strong));

  if (!words.length) {
    return [
      "## Why This Verse Is Linked",
      "",
      "Interlinear parsing did not return word-level data for this verse.",
    ];
  }

  if (!matched.length) {
    return [
      "## Why This Verse Is Linked",
      "",
      "No direct seed Strong's match found in the interlinear word list for this verse.",
      "",
      "## Interlinear Context",
      "",
      "- Loaded interlinear data, but no token matched the seed Strong's ID.",
    ];
  }

  const lines: string[] = [
    "## Why This Verse Is Linked",
    "",
    `Matched ${matched.length} interlinear token${
      matched.length === 1 ? "" : "s"
    }:`,
    "",
  ];

  for (const word of matched.slice(0, 12)) {
    const strongLink = relatedById.get(word.strong) ?? `[[${word.strong}]]`;
    const pieces = [
      word.original ?? "?",
      word.transliteration ? `(${word.transliteration})` : "",
      word.gloss ? `- ${word.gloss}` : "",
      renderMorphology(word.morphology, linkMorphologyTags),
    ].filter(Boolean);
    lines.push(`- ${strongLink}: ${pieces.join(" ")}`);
  }

  if (matched.length > 12) {
    lines.push(`- ...and ${matched.length - 12} more matches.`);
  }

  return lines;
}

function renderMorphology(
  morphology: string | undefined,
  linkTags: boolean
): string {
  if (!morphology) return "";
  const tags = parseMorphologyTags(morphology);
  if (!tags.length) return "";
  if (!linkTags) return `[${tags.join(" | ")}]`;

  const linked = tags.map((tag) => morphologyLink(tag));
  return `[${linked.join(" | ")}]`;
}

function parseMorphologyTags(morphology: string): string[] {
  const normalized = morphology
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/\s*\|\s*/g, "|")
    .replace(/\s*,\s*/g, ",")
    .trim();

  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of normalized.split(/[|,]/g)) {
    const tag = part.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

function morphologyLink(tag: string): string {
  const base = normalizePath(`${MORPHOLOGY_ROOT_FOLDER}/${safeFileName(tag)}`);
  return `[[${base}|${tag}]]`;
}

function collectMorphologyTags(words: InterlinearWord[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const word of words) {
    if (!word.morphology) continue;
    for (const tag of parseMorphologyTags(word.morphology)) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

async function ensureMorphologyNotes(
  vault: Vault,
  tags: string[],
  definitions: Map<string, string>
): Promise<void> {
  if (!tags.length) return;
  await ensureFolderPath(vault, MORPHOLOGY_ROOT_FOLDER);

  const now = new Date().toISOString().slice(0, 10);
  for (const tag of tags) {
    const fileName = `${safeFileName(tag)}.md`;
    const path = normalizePath(`${MORPHOLOGY_ROOT_FOLDER}/${fileName}`);
    const existing = vault.getAbstractFileByPath(path);
    const definition = definitions.get(tag);
    if (existing instanceof TFile) {
      await upsertMorphologyNote(vault, existing, tag, definition);
      continue;
    }

    const yaml = [
      "---",
      "type: lexicon/morphology",
      `tag: ${tag}`,
      `imported_at: ${now}`,
      "source: biblehub interlinear",
      "---",
      "",
    ].join("\n");

    const body = [
      `# ${tag}`,
      "",
      "Morphology tag imported from BibleHub interlinear context.",
      ...(definition ? ["", "## Meaning", "", `- ${definition}`] : []),
      "",
    ].join("\n");

    await vault.create(path, yaml + body);
  }
}

async function upsertMorphologyNote(
  vault: Vault,
  file: TFile,
  tag: string,
  definition?: string
): Promise<void> {
  if (!definition) return;

  const text = await vault.read(file);
  if (text.includes(`- ${definition}`)) return;

  const hasMeaning = /^## Meaning\s*$/m.test(text);
  if (!hasMeaning) {
    const next = `${text.trimEnd()}\n\n## Meaning\n\n- ${definition}\n`;
    await vault.modify(file, next);
    return;
  }

  const marker = "## Meaning";
  const idx = text.indexOf(marker);
  if (idx < 0) return;
  const insertAt = text.indexOf("\n", idx + marker.length);
  if (insertAt < 0) return;
  const next =
    text.slice(0, insertAt + 1) +
    `\n- ${definition}` +
    text.slice(insertAt + 1);
  await vault.modify(file, next);
}

function collectMorphologyDefinitions(
  words: InterlinearWord[]
): Map<string, string> {
  const out = new Map<string, string>();

  for (const word of words) {
    if (!word.morphology || !word.morphologyDetail) continue;

    const tagGroups = splitMorphologyGroups(word.morphology);
    const detailGroups = splitMorphologyDetailGroups(word.morphologyDetail);
    for (let i = 0; i < tagGroups.length; i++) {
      const tags = tagGroups[i];
      const detail = detailGroups[i] ?? word.morphologyDetail;
      for (const tag of tags) {
        if (!out.has(tag)) out.set(tag, detail);
      }
    }
  }

  return out;
}

function splitMorphologyGroups(morphology: string): string[][] {
  const normalized = morphology
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/\s*\|\s*/g, "|")
    .replace(/\s*,\s*/g, ",")
    .trim();

  return normalized
    .split("|")
    .map((group) =>
      group
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    )
    .filter((group) => group.length > 0);
}

function splitMorphologyDetailGroups(detail: string): string[] {
  return detail
    .split(/\s*::\s*/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractNasbText(html: string): string {
  // Find the NASB 1995 section and capture the verse text that follows it
  const re =
    /NASB 1995<\/a><\/span><br \/>([\s\S]*?)(?:<span class="versiontext">|<span class="p">)/i;
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function ensureFolderPath(vault: Vault, folder: string): Promise<void> {
  const clean = folder.replace(/^\/+|\/+$/g, "");
  if (!clean) return;

  const parts = clean.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    if (/[\\:*?"<>|]/.test(part)) {
      throw new Error(`Invalid folder name segment: ${part}`);
    }

    current = current ? `${current}/${part}` : part;
    const path = normalizePath(current);
    if (!(await vault.adapter.exists(path))) {
      await vault.createFolder(path);
    }
  }
}
