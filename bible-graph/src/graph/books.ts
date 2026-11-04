/**
 * Canonical book table (Protestant 66-book canon, English order).
 *
 * `id` uses STEPBible's abbreviations so references from TAGNT/TAHOT/TBES*
 * map directly to rows here. `aliases` feed the friendly-reference parser
 * in refs.ts (matched case-insensitively, ignoring spaces and dots).
 *
 * `corpus` is a traditional grouping used for filters like "where does Paul
 * use X?". It reflects conventional attribution, not a claim about authorship
 * (Hebrews in particular is kept separate from "Pauline").
 */

export type Testament = "OT" | "NT";

export type Corpus =
  | "Torah"
  | "History"
  | "Wisdom"
  | "Major Prophets"
  | "Minor Prophets"
  | "Gospels"
  | "Acts"
  | "Pauline"
  | "Hebrews"
  | "General Epistles"
  | "Revelation";

export interface Book {
  id: string;
  name: string;
  testament: Testament;
  ord: number;
  corpus: Corpus;
  aliases: string[];
}

type BookSeed = [id: string, name: string, corpus: Corpus, aliases: string[]];

const OT: BookSeed[] = [
  ["Gen", "Genesis", "Torah", ["gn", "ge"]],
  ["Exo", "Exodus", "Torah", ["ex", "exod"]],
  ["Lev", "Leviticus", "Torah", ["lv", "le"]],
  ["Num", "Numbers", "Torah", ["nm", "nu"]],
  ["Deu", "Deuteronomy", "Torah", ["dt", "deut"]],
  ["Jos", "Joshua", "History", ["josh", "jsh"]],
  ["Jdg", "Judges", "History", ["judg", "jg"]],
  ["Rut", "Ruth", "History", ["ru", "rth"]],
  ["1Sa", "1 Samuel", "History", ["1sam", "1sm"]],
  ["2Sa", "2 Samuel", "History", ["2sam", "2sm"]],
  ["1Ki", "1 Kings", "History", ["1kgs", "1kg"]],
  ["2Ki", "2 Kings", "History", ["2kgs", "2kg"]],
  ["1Ch", "1 Chronicles", "History", ["1chr", "1chron"]],
  ["2Ch", "2 Chronicles", "History", ["2chr", "2chron"]],
  ["Ezr", "Ezra", "History", ["ezra"]],
  ["Neh", "Nehemiah", "History", ["ne"]],
  ["Est", "Esther", "History", ["esth", "es"]],
  ["Job", "Job", "Wisdom", ["jb"]],
  ["Psa", "Psalms", "Wisdom", ["ps", "psalm", "pss", "psm"]],
  ["Pro", "Proverbs", "Wisdom", ["prov", "pr", "prv"]],
  ["Ecc", "Ecclesiastes", "Wisdom", ["eccl", "qoh", "ec"]],
  ["Sng", "Song of Songs", "Wisdom", ["song", "sos", "songofsolomon", "canticles"]],
  ["Isa", "Isaiah", "Major Prophets", ["is"]],
  ["Jer", "Jeremiah", "Major Prophets", ["je", "jr"]],
  ["Lam", "Lamentations", "Major Prophets", ["la"]],
  ["Ezk", "Ezekiel", "Major Prophets", ["ezek", "eze"]],
  ["Dan", "Daniel", "Major Prophets", ["dn", "da"]],
  ["Hos", "Hosea", "Minor Prophets", ["ho"]],
  ["Jol", "Joel", "Minor Prophets", ["joel", "jl"]],
  ["Amo", "Amos", "Minor Prophets", ["am"]],
  ["Oba", "Obadiah", "Minor Prophets", ["obad", "ob"]],
  ["Jon", "Jonah", "Minor Prophets", ["jnh"]],
  ["Mic", "Micah", "Minor Prophets", ["mi"]],
  ["Nam", "Nahum", "Minor Prophets", ["nah", "na"]],
  ["Hab", "Habakkuk", "Minor Prophets", ["hb"]],
  ["Zep", "Zephaniah", "Minor Prophets", ["zeph", "zp"]],
  ["Hag", "Haggai", "Minor Prophets", ["hg"]],
  ["Zec", "Zechariah", "Minor Prophets", ["zech", "zc"]],
  ["Mal", "Malachi", "Minor Prophets", ["ml"]],
];

const NT: BookSeed[] = [
  ["Mat", "Matthew", "Gospels", ["matt", "mt"]],
  ["Mrk", "Mark", "Gospels", ["mark", "mk", "mr"]],
  ["Luk", "Luke", "Gospels", ["luke", "lk"]],
  ["Jhn", "John", "Gospels", ["john", "jn"]],
  ["Act", "Acts", "Acts", ["ac"]],
  ["Rom", "Romans", "Pauline", ["ro", "rm"]],
  ["1Co", "1 Corinthians", "Pauline", ["1cor"]],
  ["2Co", "2 Corinthians", "Pauline", ["2cor"]],
  ["Gal", "Galatians", "Pauline", ["ga"]],
  ["Eph", "Ephesians", "Pauline", ["ephes"]],
  ["Php", "Philippians", "Pauline", ["phil"]],
  ["Col", "Colossians", "Pauline", []],
  ["1Th", "1 Thessalonians", "Pauline", ["1thess", "1ths"]],
  ["2Th", "2 Thessalonians", "Pauline", ["2thess", "2ths"]],
  ["1Ti", "1 Timothy", "Pauline", ["1tim", "1tm"]],
  ["2Ti", "2 Timothy", "Pauline", ["2tim", "2tm"]],
  ["Tit", "Titus", "Pauline", ["ti"]],
  ["Phm", "Philemon", "Pauline", ["philem", "phlm"]],
  ["Heb", "Hebrews", "Hebrews", ["he"]],
  ["Jas", "James", "General Epistles", ["jam", "jm"]],
  ["1Pe", "1 Peter", "General Epistles", ["1pet", "1pt"]],
  ["2Pe", "2 Peter", "General Epistles", ["2pet", "2pt"]],
  ["1Jn", "1 John", "General Epistles", ["1john", "1jo"]],
  ["2Jn", "2 John", "General Epistles", ["2john", "2jo"]],
  ["3Jn", "3 John", "General Epistles", ["3john", "3jo"]],
  ["Jud", "Jude", "General Epistles", ["jude", "jd"]],
  ["Rev", "Revelation", "Revelation", ["re", "rv", "apocalypse", "revelations"]],
];

function build(seeds: BookSeed[], testament: Testament, startOrd: number): Book[] {
  return seeds.map(([id, name, corpus, aliases], i) => ({
    id,
    name,
    testament,
    ord: startOrd + i,
    corpus,
    aliases,
  }));
}

export const BOOKS: readonly Book[] = [...build(OT, "OT", 1), ...build(NT, "NT", OT.length + 1)];

export const BOOKS_BY_ID: ReadonlyMap<string, Book> = new Map(BOOKS.map((b) => [b.id, b]));
