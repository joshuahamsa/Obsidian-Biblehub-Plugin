# BibleHub Lexicon Importer (Obsidian Plugin)

Import BibleHub Strong's lexicon entries into graph-ready Obsidian notes with typed links, YAML frontmatter, and optional BFS crawling.

## Features

- Accepts Strong's IDs (e.g., `G2222`, `H1623`) or BibleHub URLs.
- Fetches Strong's pages with rate limiting and caching.
- Parses lexical fields and basic "See ####" cross-references.
- Writes notes with consistent YAML and section markers for future updates.
- BFS crawl of typed edges with depth/node limits.

## Installation

1. Copy this folder into your vault at `.obsidian/plugins/obsidian-biblehub-lexicon-importer`.
2. In Obsidian: Settings -> Community plugins -> Enable "BibleHub Lexicon Importer".

## Usage

1. Open the command palette.
2. Run: `Import Strong's as graph (BibleHub)`.
3. Enter a Strong's ID or a BibleHub Strong's URL.

Input examples:

- `G2222`
- `H1623`
- `https://biblehub.com/strongs/greek/2222.htm`
- `https://biblehub.com/strongs/hebrew/1623.htm`

The plugin creates or updates notes under the configured root folder.

## Settings

All settings are available in the plugin's settings tab:

- Root folder: destination for notes.
- Max depth: BFS crawl depth.
- Max nodes: maximum notes created/updated per run.
- Rate limit (ms): delay between requests.
- Skip existing notes: do not refetch/overwrite existing notes.
- Rename note on update: keeps titles in sync when re-importing.

## Note Output

Each note includes:

- YAML frontmatter with Strong's metadata and source URLs.
- Section markers: `<!-- imported: section_key -->`.
- Outbound link groups: see also / related / topical.

## Development

```bash
# Install deps
npm install

# Dev build (watch)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Run tests matching a name
npm run test:specific -- "normalize"
```

## Notes

- BibleHub has Terms of Use. Keep usage user-initiated and rate-limited.
- The parser is intentionally simple and extensible. Improve section parsing as needed.

## License

MIT
