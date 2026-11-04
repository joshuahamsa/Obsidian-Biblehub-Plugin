/**
 * Bible reference parsing and normalization.
 *
 * Canonical form is STEPBible's `Book.Ch.V` (e.g. `Jhn.21.15`), which is also
 * the verse node ID in the graph. Occurrence IDs append `#NN` (`Jhn.21.15#12`).
 *
 * parseRef() accepts the messy input people (and LLMs) actually type:
 *   "John 21:15", "Jn 21.15", "1 Cor 13:4", "Jhn.21.15", "psalm 23:1"
 */

import { BOOKS, BOOKS_BY_ID, type Book } from "./books.js";

export interface VerseRef {
  book: string; // canonical book ID, e.g. "Jhn"
  chapter: number;
  verse: number;
}

/** Collapse case, spaces and dots so "1 Cor." and "1cor" compare equal. */
function aliasKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s.]/g, "");
}

const BOOK_LOOKUP: ReadonlyMap<string, Book> = (() => {
  const map = new Map<string, Book>();
  for (const book of BOOKS) {
    for (const key of [book.id, book.name, ...book.aliases]) {
      map.set(aliasKey(key), book);
    }
  }
  return map;
})();

/** Resolve a book name/abbreviation to its canonical ID, or null if unknown. */
export function resolveBook(raw: string): string | null {
  return BOOK_LOOKUP.get(aliasKey(raw))?.id ?? null;
}

// Book part: optional leading 1-3 plus letters/spaces ("1 Cor", "Song of Songs").
// Then chapter, a separator (: or .), and verse.
const FRIENDLY_REF = /^\s*([1-3]?\s*[A-Za-z][A-Za-z\s.]*?)\s*\.?\s*(\d+)\s*[:.]\s*(\d+)\s*$/;

/** Parse a friendly or canonical verse reference. Returns null if unparseable. */
export function parseRef(raw: string): VerseRef | null {
  const m = FRIENDLY_REF.exec(raw);
  if (!m) return null;
  const [, bookPart, ch, vs] = m;
  const book = resolveBook(bookPart ?? "");
  if (!book) return null;
  const chapter = Number(ch);
  const verse = Number(vs);
  if (chapter < 1 || verse < 1) return null;
  return { book, chapter, verse };
}

export function formatRef(ref: VerseRef): string {
  return `${ref.book}.${ref.chapter}.${ref.verse}`;
}

/** Human-readable form for UI and agent output: "John 21:15". */
export function displayRef(ref: VerseRef): string {
  const name = BOOKS_BY_ID.get(ref.book)?.name ?? ref.book;
  return `${name} ${ref.chapter}:${ref.verse}`;
}

/** Normalize any accepted input to the canonical verse ID, or null. */
export function normalizeRef(raw: string): string | null {
  const ref = parseRef(raw);
  return ref ? formatRef(ref) : null;
}

export interface OccurrenceRef extends VerseRef {
  word: number;
}

/**
 * Parse the leading ID field of a TAGNT/TAHOT word row.
 *
 *   "Mat.1.1#01=NKO"        -> { Mat 1:1 word 1, type "NKO" }
 *   "Mal.4.1(3.19)#02=L"    -> { Mal 4:1 word 2, altRef "Mal.3.19", type "L" }
 *
 * The bracketed part is the alternate (Hebrew/NA/KJV) versification. Square
 * and curly brackets mark other traditions in TAGNT; all are captured as altRef.
 */
export function parseWordId(
  field: string,
): { ref: OccurrenceRef; id: string; verseId: string; altRef: string | null; textType: string } | null {
  const m = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:[([{]([\d.]+)[)\]}])?#(\d+)=(.+)$/.exec(field.trim());
  if (!m) return null;
  const [, book, ch, vs, alt, word, textType] = m;
  if (!book || !BOOKS_BY_ID.has(book)) return null;
  const ref: OccurrenceRef = { book, chapter: Number(ch), verse: Number(vs), word: Number(word) };
  const verseId = formatRef(ref);
  return {
    ref,
    verseId,
    id: `${verseId}#${String(ref.word).padStart(2, "0")}`,
    altRef: alt ? altToRef(book, alt) : null,
    textType: textType ?? "",
  };
}

/** "3.19" -> "Mal.3.19". Alternate refs are stored as-is; Phase 1 verifies their shapes. */
function altToRef(book: string, alt: string): string {
  return `${book}.${alt}`;
}
