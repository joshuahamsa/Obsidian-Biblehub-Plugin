# Bible Graph — Specification

> A concordance in the form of a knowledge graph, built for AI-assisted Bible study.

**Status:** v0.1 draft (Phase 0)
**Hackathon:** AI for Church, build window Oct 30 – Nov 27, 2026 (23:59 ET)
**Scope:** Old and New Testaments, original-language words, lexicon, and the links between them.

---

## 1. Problem and audience

Pastors, Bible teachers, and small-group leaders want to know what a word *actually* says in Greek or Hebrew, where else it appears, and how it connects to other words. Most of them don't read the original languages.

General-purpose AI chat is fluent but unreliable at this. It blurs words that look alike, makes up occurrence counts, and states interpretation as if it were lexical fact.

**Bible Graph** gives an AI agent a structured, citable concordance to reason over. Every claim in an answer traces back to graph nodes (specific words, verses, and lexicon entries) that the user can click and verify.

### Design principles

1. **Evidence, not verdicts.** The agent reports what the text and lexicons show and leaves interpretation to the reader. (Hackathon rule 8: respect for Scripture.)
2. **Every claim is cited.** Answers reference node IDs returned by tools. No tool result means no claim.
3. **Open data, properly attributed.** Data comes only from licensed sources (§3). Nothing is scraped.
4. **The graph is infrastructure.** The same query layer serves an MCP server (any Claude client) and the web app.

---

## 2. Example questions it must answer well

| # | Question | Graph path |
|---|---|---|
| 1 | "What Greek word is 'love' in John 21:15–17, and does it change?" | verse → occurrences → lemmas (G0025 vs G5368) |
| 2 | "Where else does Paul use ζάω?" | lemma → occurrences, filtered to Pauline letters |
| 3 | "Which Hebrew word does the NT's Ἀβραάμ correspond to?" | lemma → `greek_of` → Hebrew lemma |
| 4 | "Show every OT verse using חֶסֶד in Psalms." | lemma → occurrences, filtered to the book |
| 5 | "How is 'beginning' in Gen 1:1 related to 'beginning' in John 1:1?" | `find_path` across `greek_of` / `lxx_for` / lexicon refs |
| 6 | "Break down Romans 12:1 word by word." | verse → occurrences + grammar descriptions |

These become the seed of the eval set (§8).

---

## 3. Data sources

| Source | Content | License |
|---|---|---|
| **STEPBible TAGNT** (2 files) | Every Greek NT word in all major editions: ref, Greek, English, dStrong, grammar, editions, variants, sub-meaning | CC BY 4.0 |
| **STEPBible TAHOT** (4 files) | Every Hebrew OT word (Leningrad): ref, Hebrew, transliteration, English, dStrongs incl. prefixes, grammar | CC BY 4.0 |
| **STEPBible TBESG** | Greek lexicon keyed by extended Strong's, with Greek→Hebrew mapping and tagged verse refs | CC BY 4.0 |
| **STEPBible TBESH** | Hebrew lexicon (abridged BDB) keyed by extended Strong's | CC BY 4.0 |
| **STEPBible TEGMC / TEHMC** | Expansions of the Greek and Hebrew grammar codes | CC BY 4.0 (verify in Phase 1) |

**Required attribution** (shown in the app footer, About page, and README):

> Data created by STEPBible.org based on work at Tyndale House Cambridge, licensed CC BY 4.0.
> Source: https://STEPBible.github.io/STEPBible-Data

**Constraints from the license notes:**
- Do **not** commit or re-host the raw data files. `scripts/fetch-data.ts` downloads them into `data/raw/` (gitignored).
- Our derived SQLite database is a reformatting, which the license allows. Record our transformations in `DATA_CHANGES.md`.
- The English word glosses are based on the Berean Study Bible, used by STEPBible with permission. They come to us through the CC BY data, so we display them as part of that data.

### 3.1 Verified file formats (from samples)

**TAGNT word row** (tab-separated; a header row starting with `Word & Type` precedes each verse block):

```
Mat.1.1#01=NKO  Βίβλος (Biblos)  [The] book  G0976=N-NSF  βίβλος=book  NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz  <meaning var>  <spelling var>  Libro  book  #01  G0976  <alt>
```

| Col | Field | Use |
|---|---|---|
| 0 | `Ref#Word=Type` | occurrence ID + word type (N/K/O codes) |
| 1 | `Greek (translit)` | surface form + transliteration |
| 2 | English | per-word gloss in context |
| 3 | `dStrong=Grammar` | lemma ID + grammar code |
| 4 | `Lemma=Gloss` | dictionary form |
| 5 | Editions | `+`-joined edition list |
| 9 | Sub-meaning | e.g. `Jesus»Jesus\|Jesus@Mat.1.1` (identifies the person) |
| 11 | sStrong+Instance | simple Strong's |

- **Word type:** `N` = Nestle-Aland (modern Bibles), `K` = KJV/TR, `O` = other. Lower case or brackets mark minor or variant presence.
- **Default NT text:** words whose type contains uppercase `N`. Words outside it stay in the graph, tagged with `in_default_text = 0`.
- Verse blocks begin with `# Mat.1.1` interlinear lines. The parser skips `#` lines and uses word rows only.
- Name words sometimes carry a Hebrew link in the interlinear line: `H0085|G0011«G0011=N-GSM-P`.

**TAHOT word row:**

```
Gen.1.1#01=L  בְּ/רֵאשִׁ֖ית  be./re.Shit  in/ beginning  H9003/{H7225G}  HR/Ncfsa  ...  H7225G  ...  H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first:1_beginning}
```

- dStrongs field: `/` separates morphemes. The `{…}` morpheme is the **main word**; the others are prefixes or suffixes (H9003 "in", H9009 "the").
- Grammar is split by `/` in parallel with the morphemes.
- **Text type:** `L` = Leningrad, `Q` = Qere, `K` = Ketiv, `R` = restored, `X` = LXX-only additions.
- **Default OT text:** `L`, `Q`, `R` (what translators follow). `K` and `X` are kept but tagged non-default.
- References use English (NRSV) versification, with the Hebrew reference in brackets when it differs. We store both.

**TBESG / TBESH row:**

```
G0011  G0011 = the Greek of  H0085  Ἀβραάμ  Abraam  N:N-M-P  Abraham  <definition HTML with <ref='Gen.17.5'> tags>
H0001  H0001G =              H0001G  אָב     av     H:N-M    father   1) father of an individual<br>2) ...
```

| Col | Field |
|---|---|
| 0 | Base Strong's |
| 1 | Relation text (`=`, `= the Greek of`, `= a Part of`, …) |
| 2 | Target extended Strong's (self, or the related word) |
| 3–6 | Lemma, transliteration, `Lang:POS`, gloss |
| 7 | Definition HTML |

- Rows with `= the Greek of Hxxxx` produce a `greek_of` edge.
- `<ref='Mat.5.43'>` tags produce `lexicon_ref` edges (lemma → verse).
- TBESH has several rows per base number (disambiguated senses, people with the same name). The extended ID (e.g. `H0001G`) is the node key.

---

## 4. Graph model (SQLite)

The graph is a property graph stored relationally. Occurrence links live in their own table because they make up most of the graph (~440k rows) and need fast filtering. All other relationships share one `edges` table.

```sql
-- Canonical book list (hand-written seed, 66 rows)
CREATE TABLE books (
  id          TEXT PRIMARY KEY,   -- STEPBible abbrev: 'Gen', 'Mat', '1Co'
  name        TEXT NOT NULL,      -- 'Genesis', '1 Corinthians'
  testament   TEXT NOT NULL CHECK (testament IN ('OT','NT')),
  ord         INTEGER NOT NULL,   -- canonical order 1..66
  corpus      TEXT                -- traditional grouping: 'Torah','Pauline','Gospels', ...
);

CREATE TABLE verses (
  id          TEXT PRIMARY KEY,   -- 'Mat.1.1' (English/NRSV versification)
  book_id     TEXT NOT NULL REFERENCES books(id),
  chapter     INTEGER NOT NULL,
  verse       INTEGER NOT NULL,
  ord         INTEGER NOT NULL,   -- global canonical order, for range queries
  alt_ref     TEXT,               -- Hebrew or other versification when different
  english     TEXT                -- reconstructed from default-text word glosses
);

CREATE TABLE lemmas (
  id          TEXT PRIMARY KEY,   -- extended Strong's: 'G0026', 'H7225G'
  strong      TEXT NOT NULL,      -- base Strong's: 'G0026', 'H7225'
  lang        TEXT NOT NULL CHECK (lang IN ('greek','hebrew','aramaic')),
  lemma       TEXT NOT NULL,      -- 'ἀγάπη'
  translit    TEXT,
  pos         TEXT,               -- 'N-F', 'V', 'N-M-P'
  gloss       TEXT,               -- 'love'
  definition  TEXT,               -- plain text (HTML stripped)
  definition_html TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 0  -- default text only; denormalized
);

CREATE TABLE occurrences (
  id          TEXT PRIMARY KEY,   -- 'Mat.1.1#01'
  verse_id    TEXT NOT NULL REFERENCES verses(id),
  position    INTEGER NOT NULL,
  lemma_id    TEXT NOT NULL REFERENCES lemmas(id),
  surface     TEXT NOT NULL,      -- 'Βίβλος' / 'בְּ/רֵאשִׁ֖ית'
  translit    TEXT,
  english     TEXT,
  morph       TEXT,               -- 'N-NSF' / 'HR/Ncfsa'
  affixes     TEXT,               -- JSON: [{"strong":"H9003","morph":"HR","gloss":"in"}]
  text_type   TEXT,               -- raw type code: 'NKO', 'L', 'Q', 'K(O)'
  in_default_text INTEGER NOT NULL,
  editions    TEXT,               -- NT only
  sub_meaning TEXT                -- 'Jesus@Mat.1.1' style disambiguation
);
CREATE INDEX occ_lemma ON occurrences(lemma_id, in_default_text);
CREATE INDEX occ_verse ON occurrences(verse_id, position);

CREATE TABLE morph_codes (
  code        TEXT PRIMARY KEY,   -- 'V-AAI-3S'
  lang        TEXT NOT NULL,
  description TEXT NOT NULL       -- 'Verb, aorist, active, indicative, 3rd person, singular'
);

CREATE TABLE edges (
  src         TEXT NOT NULL,      -- node ID (lemma or verse)
  dst         TEXT NOT NULL,
  type        TEXT NOT NULL,      -- see edge types below
  source      TEXT NOT NULL,      -- provenance: 'TBESG', 'TAGNT', ...
  note        TEXT,
  PRIMARY KEY (src, dst, type)
);
CREATE INDEX edges_dst ON edges(dst, type);

CREATE VIRTUAL TABLE lemma_fts USING fts5(id UNINDEXED, lemma, translit, gloss, definition);

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);  -- data versions, build date, attribution
```

### Node ID conventions

| Node | Pattern | Example |
|---|---|---|
| Lemma | `[GH]\d{4}[A-Z]?` | `G0026`, `H7225G` |
| Verse | `Book.Ch.V` | `Jhn.21.15` |
| Occurrence | `Book.Ch.V#NN` | `Jhn.21.15#12` |
| Grammar code | raw code | `V-AAI-3S` |

These IDs are what the agent cites and the UI links to. They are stable across rebuilds.

### Edge types

| Type | From → To | Derived from | Phase |
|---|---|---|---|
| `greek_of` | G lemma → H lemma | TBESG col 1–2 `= the Greek of` | 1 |
| `lexicon_ref` | lemma → verse | `<ref='…'>` tags in definitions | 1 |
| `part_of` | lemma → lemma | TBESH `= a Part of` | 1 |
| `name_link` | G lemma → H lemma | TAGNT `H0085\|G0011` markers | 1 |
| `lxx_for` | G lemma → H lemma | "in LXX for אהב" in TBESG, matched to TBESH by Hebrew lemma | 2 (stretch) |
| `same_root` | lemma ↔ lemma | TAHOT root field | 2 (stretch) |

(Occurrence links, word → verse, come from the `occurrences` table rather than `edges`.)

---

## 5. Query layer (`src/graph/`)

These are pure TypeScript functions over a read-only database handle. Both the MCP server and the web agent call them. Every result includes the node IDs it touched, so citations can be checked.

```ts
lookupLemma(q: string): LemmaHit[]
  // q = Strong's ('G26', 'G0026', 'H7225G'), lemma ('ἀγάπη'), translit ('agape'), or English gloss (FTS)

getLemma(id: string): Lemma & { greekOf?: LemmaRef[]; hebrewFor?: LemmaRef[]; occurrenceCount: number }

occurrences(lemmaId: string, opts?: {
  book?: string; corpus?: string; testament?: 'OT'|'NT';
  morph?: string;          // prefix match: 'V-A' = all aorist verbs
  includeVariants?: boolean; limit?: number; offset?: number;
}): { total: number; byBook: Record<string, number>; items: OccurrenceHit[] }

verseWords(ref: string): { verse: Verse; words: WordDetail[] }   // incl. grammar descriptions
verseRange(from: string, to: string): Verse[]

related(lemmaId: string, types?: EdgeType[]): Edge[]

findPath(from: string, to: string, maxHops = 4): PathStep[] | null
  // BFS over edges + occurrence links (lemma—verse—lemma), bounded

cooccurring(lemmaId: string, opts?: { window: 'verse'; limit?: number }): { lemma: LemmaRef; count: number }[]
```

`ref` accepts friendly input (`John 21:15`, `Jn 21.15`, `Jhn.21.15`) and normalizes it with `src/graph/refs.ts`.

---

## 6. Agent (`src/server/agent.ts`)

- **Model:** set by `BIBLE_GRAPH_MODEL`; defaults to `claude-sonnet-5-5` to keep demo costs down, with `claude-opus-5-5` as an option.
- **Tools:** the query layer from §5, exposed one-to-one with JSON schemas. The MCP server exposes the same set.
- **System prompt contract:**
  1. Use tools before making any claim about words, counts, or verses.
  2. Cite with `[[G0026]]`, `[[Jhn.21.15]]`, `[[Jhn.21.15#12]]`. Each cited ID must appear in this turn's tool results.
  3. Separate *what the data shows* from *common interpretations*. Label interpretation as such and don't take doctrinal sides.
  4. When the data doesn't support an answer, say so.
- **Citation check (server side):** after the agent replies, every `[[id]]` is checked against the IDs returned by tools in that turn. Unverified citations are flagged in the UI and counted in evals.
- **Streaming:** Server-Sent Events carry text deltas and tool-call events. The UI animates the graph as each tool runs.

---

## 7. Surfaces

| Surface | Phase | Description |
|---|---|---|
| CLI (`npm run query -- lemma G26`) | 2 | Dev/debug |
| **MCP server** (stdio) | 2 | Installable in Claude Desktop / Claude Code. A complete entry if time runs short. |
| **Web app** | 3 | Fastify API + React/Vite. Left: chat. Right: graph canvas (Cytoscape.js) that highlights nodes as tools touch them. Click a node for a detail drawer (lemma card, verse interlinear). |

### Web UI essentials
- Starter questions (from §2) on the empty state.
- Interlinear verse view: original, transliteration, gloss, and grammar on hover.
- Citation chips in answers that focus the matching graph node.
- Attribution footer (§3) and an About page explaining sources and limits.
- No accounts and no personal data (rule 9). Per-IP rate limit and a daily token budget on the hosted demo.

---

## 8. Quality and evaluation

- **Ingest tests:** known counts (e.g. default-text occurrences of G0026 ἀγάπη, H2617 חֶסֶד; total NT words in the default text ≈ 138k), sample-row parsing, ref normalization, Hebrew affix splitting.
- **Query tests:** golden outputs for the §2 questions, run against a small fixture database.
- **Agent eval** (`npm run eval`): about 20 questions, each with the node IDs a correct answer must cite. Metrics: required-citation recall, unverified-citation rate, tool-call count, tokens.
- Counts we can't verify against a second source are labeled "per STEPBible data" in the UI.

---

## 9. Non-goals (for the hackathon)

- Full English translations beyond reconstructed per-word glosses.
- User accounts, saved studies, sharing.
- Deuterocanonical books. (TBESG mentions LXX refs; they appear as `lexicon_ref` targets only if the verse exists.)
- Doctrinal commentary or sermon generation.

---

## 10. Open questions

1. Hosting target for the live demo (Fly.io / Render / small VM): decide in Phase 4.
2. Whether `lxx_for` matching is reliable enough to ship: decide after the Phase 2 spike.
3. Aramaic portions (Dan/Ezra): confirm how TAHOT marks the language (grammar prefix `A` vs `H`).
4. Hackathon track: TBD once tracks are known.
