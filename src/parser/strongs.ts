import type { LexiconEntry, ScriptureRef } from "../types";
import { htmlToText, pickLabel } from "./common";
import { normalizeStrongId, langFromStrong } from "../normalize";
import { makeScriptureRefFromSlug } from "../scripture";

export function parseStrongsPage(strong: string, url: string, html: string): LexiconEntry {
  const lang = langFromStrong(strong);
  const text = htmlToText(html);

  // These labels are commonly present on BibleHub Strong's pages
  const lemma = pickLabel(text, "Original Word");
  const transliteration = pickLabel(text, "Transliteration");
  const phonetic = pickLabel(text, "Phonetic Spelling");
  const pronunciation = pickLabel(text, "Pronunciation");
  const part_of_speech = pickLabel(text, "Part of Speech");

  // "Definition" label often exists, but we keep a short version for title
  const definition = pickLabel(text, "Definition");

  // NOTE: gloss/short_definition intentionally omitted (often missing on BibleHub)

  // Extract HELPS "See ####" references in a simple way from the plain text
  const seeAlso: string[] = [];
  const seeMatches = Array.from(text.matchAll(/\bSee\s+([0-9]{1,5})\b/g));
  for (const m of seeMatches) {
    const id = normalizeStrongId(m[1], lang);
    if (id) seeAlso.push(id);
  }

  // Extract scripture references from interlinear links in the HTML
  const scripture = extractScriptureRefsFromHtml(html);

  // Blocks: keep them simple for now
  const blocks: LexiconEntry["blocks"] = {
    lexical_summary: buildLexicalSummaryBlock({ lemma, transliteration, pronunciation, phonetic, part_of_speech, definition }),
    strongs_definition: definition ? definition : "",
    helps: extractSectionApprox(text, "HELPS Word-studies", 2000),
    thayers: extractSectionApprox(text, "Thayer's Greek Lexicon", 3000),
    forms_transliterations: extractSectionApprox(text, "Forms of", 1200) || extractSectionApprox(text, "Forms & Transliterations", 1200),
    englishmans_concordance: extractSectionApprox(text, "Englishman's Concordance", 3000),
    concordance: extractSectionApprox(text, "Concordance", 2000),
    topical_lexicon: extractSectionApprox(text, "Topical Lexicon", 2000),
  };

  // If we didn't find the section headers reliably, keep empty strings instead of undefined
  for (const k of Object.keys(blocks) as Array<keyof typeof blocks>) {
    if (!blocks[k]) blocks[k] = "";
  }

  // Extract any Strong's-like references from key blocks to create links
  const related = uniq([
    ...extractStrongRefs(blocks.helps ?? "", lang),
    ...extractStrongRefs(blocks.thayers ?? "", lang),
    ...extractStrongRefs(blocks.strongs_definition ?? "", lang),
  ]).filter((id) => id !== strong);

  return {
    strong,
    lang,
    lemma,
    transliteration,
    pronunciation,
    phonetic,
    part_of_speech,
    // gloss/short_definition intentionally omitted
    source_primary: url,
    source_alt: [],
    blocks,
    links: {
      see_also: uniq(seeAlso),
      related_strongs: related,
      topical: [],
      scripture
    }
  };
}

function extractStrongRefs(text: string, lang: string): string[] {
  if (!text) return [];
  const refs: string[] = [];
  // Match patterns like "STRONGS NT 2222", "Strong's 2222", or plain numbers
  const matches = Array.from(text.matchAll(/\b(?:STRONGS?\s*(?:NT|OT)?\s*)?([0-9]{1,5})\b/gi));
  for (const m of matches) {
    const id = normalizeStrongId(m[1], lang);
    if (id) refs.push(id);
  }
  return refs;
}

function extractScriptureRefsFromHtml(html: string): ScriptureRef[] {
  const refs: ScriptureRef[] = [];
  const re = /(?:https?:\/\/biblehub\.com)?\/interlinear\/([a-z0-9_]+)\/(\d+)-(\d+)\.htm/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const slug = m[1];
    const chapter = parseInt(m[2], 10);
    const verse = parseInt(m[3], 10);
    const key = `${slug}:${chapter}:${verse}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(makeScriptureRefFromSlug(slug, chapter, verse));
  }
  return refs;
}


function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function buildLexicalSummaryBlock(fields: Record<string, string | undefined>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!v) continue;
    lines.push(`- **${human(k)}:** ${v}`);
  }
  return lines.join("\n");
}

function human(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Very simple approximate extractor:
 * Finds a header line and takes N chars after it.
 * Later you'll replace with DOM-based extraction per section.
 */
function extractSectionApprox(text: string, header: string, maxChars: number): string {
  const idx = text.toLowerCase().indexOf(header.toLowerCase());
  if (idx < 0) return "";
  const slice = text.slice(idx, idx + maxChars);
  return slice.trim();
}