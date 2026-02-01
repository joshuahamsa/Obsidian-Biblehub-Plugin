export type Lang = "greek" | "hebrew";

export type EdgeType =
  | "see_also"          // HELPS "See ####"
  | "related_strongs"   // Thayer refs etc.
  | "topical";          // Topical lexicon (stubbed)

export type LinkType = "strongs" | "scripture";

export type SectionKey =
  | "lexical_summary"
  | "strongs_definition"
  | "helps"
  | "thayers"
  | "forms_transliterations"
  | "englishmans_concordance"
  | "concordance"
  | "topical_lexicon";

export interface ScriptureRef {
  slug: string; // e.g. "2_corinthians"
  chapter: number;
  verse: number;
  display: string; // e.g. "2 Corinthians 5:15"
  interlinearUrl: string;
  nasbUrl: string;
}

export interface LexiconEntry {
  strong: string; // "G2198" / "H1623"
  lang: Lang;

  lemma?: string;
  transliteration?: string;
  pronunciation?: string;
  phonetic?: string;
  part_of_speech?: string;

  gloss?: string;
  short_definition?: string;

  source_primary: string; // strongs page
  source_alt: string[];   // greek/hebrew page etc.

  // Imported blocks to drop into template sections
  blocks: Partial<Record<SectionKey, string>>;

  // Typed links: store normalized Strong's IDs now; writer converts to wikilinks
  links: {
    see_also: string[];
    related_strongs: string[];
    topical: string[];
    scripture: ScriptureRef[];
  };
}

export interface CrawlResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

export interface Recipe {
  id: string;

  includeSections: SectionKey[];
  followEdges: EdgeType[];
  linkTypes: LinkType[]; // strongs, scripture
  linkGreekHebrew: boolean; // auto-link Greek/Hebrew terms
  lemmaAliasMode: "primary" | "all";

  maxDepth: number;
  maxNodes: number;

  rateLimitMs: number;
  skipExisting: boolean;

  rootFolder: string; // where to write Strong's notes
  scriptureRootFolder: string; // where to write scripture notes
  noteTitlePattern: string; // e.g. "{{strong}} — {{lemma}} ({{transliteration}})"
}