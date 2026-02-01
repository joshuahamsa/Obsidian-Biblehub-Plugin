# AGENTS.md - Development Guide for BibleHub Lexicon Importer

## Project Overview

This is an Obsidian plugin for importing BibleHub Strong's lexicon entries into graph-ready notes. The plugin fetches data from BibleHub, parses lexical information, and creates/update Obsidian notes with proper YAML frontmatter and typed links.

**Technology Stack:**
- TypeScript with strict typing
- Obsidian Plugin API
- ESBuild for bundling
- No external dependencies beyond Obsidian

## Build/Lint/Test Commands

```bash
# Development build with hot reload
npm run dev

# Production build
npm run build

# TypeScript type checking
npm run typecheck

# ESLint linting
npm run lint

# Format code (if Prettier is configured)
npm run format

# Run tests (if test framework is set up)
npm test

# Run specific test file (if using Jest)
npm test -- --testNamePattern="specific-test"
```

**Note:** This follows the standard Obsidian plugin template structure. If no test framework is set up, add Jest or Vitest for testing.

## Code Style Guidelines

### Imports

**Order and grouping:**
1. Obsidian imports first
2. Third-party library imports (alphabetical)
3. Local type imports (use `import type`)
4. Local module imports (alphabetical)

```typescript
// ✅ Correct import order
import { App, Modal, Notice, Plugin } from "obsidian";
import { requestUrl } from "obsidian";

import type { Recipe, SectionKey, EdgeType } from "./types";
import type BibleHubLexiconImporter from "./main";

import { normalizeStrongId, langFromStrong } from "./normalize";
import { Fetcher } from "./fetcher";
import { Writer } from "./writer";
```

### Naming Conventions

- **Classes:** PascalCase (`BibleHubLexiconImporter`, `SettingsTab`)
- **Interfaces/Types:** PascalCase (`LexiconEntry`, `Recipe`)
- **Functions/Variables:** camelCase (`normalizeStrongId`, `parseStrongsPage`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_SETTINGS`, `DEFAULT_RECIPE`)
- **Files:** kebab-case for config, PascalCase for classes (`strongs.ts`, `main.ts`)

### TypeScript Patterns

**Use strict typing:**
```typescript
// ✅ Explicit typing for interfaces
export interface LexiconEntry {
  strong: string;
  lang: Lang;
  lemma?: string;  // Optional fields marked with ?
  blocks: Partial<Record<SectionKey, string>>;
}

// ✅ Function return types
export function normalizeStrongId(raw: string, langHint?: Lang): string | null {
  // implementation
}

// ✅ Generic types properly constrained
function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
```

### Error Handling

**Pattern for async operations:**
```typescript
try {
  const url = strongsUrl(strong);
  const html = await this.fetcher.get(url, true);
  const entry: LexiconEntry = parseEntryFromStrongsPage(strong, url, html);
  // Process entry...
} catch (e: any) {
  res.errors.push({ id: strong, error: e?.message ?? String(e) });
}
```

**Validation and fallbacks:**
```typescript
// ✅ Null checks and fallbacks
const definition = pickLabel(text, "Definition");
const short_definition = (definition ?? "")
  .replace(/[.;:].*$/, "")
  .trim()
  .split(/\s+/)
  .slice(0, 4)
  .join(" ")
  .trim() || undefined;
```

### Async/Await Patterns

- Always use async/await instead of Promise chains
- Handle rate limiting gracefully
- Use proper error boundaries

```typescript
// ✅ Rate limiting with async delays
private async rateLimit() {
  const now = Date.now();
  const delta = now - this.lastFetchAt;
  if (delta < this.rateLimitMs) {
    await new Promise((r) => setTimeout(r, this.rateLimitMs - delta));
  }
  this.lastFetchAt = Date.now();
}
```

## Project Structure

```
obsidian-biblehub-lexicon-importer/
├── manifest.json          # Plugin metadata
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── esbuild.config.mjs    # Build configuration
├── styles.css            # Plugin styles
└── src/
    ├── main.ts           # Plugin entry point and command registration
    ├── settings.ts       # Settings UI and default configuration
    ├── types.ts          # TypeScript interfaces and type definitions
    ├── normalize.ts      # Utility functions for Strong's IDs and URLs
    ├── fetcher.ts        # HTTP client with caching and rate limiting
    ├── writer.ts         # Note creation and update logic
    ├── crawler.ts        # BFS crawling implementation
    └── parser/
        ├── index.ts      # Parser entry point
        ├── strongs.ts    # BibleHub Strong's page parsing
        └── common.ts     # HTML parsing utilities
```

## Key Architecture Patterns

### Modular Design
- **Separation of concerns:** Each module handles one responsibility
- **Dependency injection:** Classes receive dependencies via constructor
- **Type-safe interfaces:** All data structures have explicit TypeScript types

### Plugin Lifecycle
```typescript
export default class BibleHubLexiconImporter extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SettingsTab(this.app, this));
    
    // Register commands and event handlers
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

### Settings Management
- Use interface for settings structure
- Provide sensible defaults
- Auto-save on change
- Use Obsidian's Setting API for UI

### Data Processing Pipeline
1. **Input** → Strong's ID or URL validation
2. **Fetch** → Rate-limited HTTP requests with caching
3. **Parse** → Extract structured data from HTML
4. **Write** → Create/update Obsidian notes with YAML frontmatter
5. **Crawl** → BFS traversal of typed links

## Obsidian API Patterns

### File Operations
```typescript
// ✅ Safe file creation with folder handling
async ensureFolder(recipe: Recipe) {
  const folder = normalizePath(recipe.rootFolder.replace(/^\/+|\/+$/g, ""));
  if (!(await this.vault.adapter.exists(folder))) {
    await this.vault.createFolder(folder);
  }
}

// ✅ Proper file upsert pattern
async upsert(entry: LexiconEntry, recipe: Recipe, renameOnUpdate: boolean): Promise<{ file: TFile; created: boolean }> {
  const existing = this.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await this.mergeIntoFile(existing, entry, recipe);
    return { file: existing, created: false };
  }
  
  const content = this.renderNew(entry, recipe);
  const file = await this.vault.create(path, content);
  return { file, created: true };
}
```

### User Interface
```typescript
// ✅ Modal pattern for user input
class SeedModal extends Modal {
  async openAndGetValue(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.open();
    });
  }
  
  onOpen() {
    // Build UI elements
    // Set up event handlers
  }
}
```

## Testing Guidelines

When implementing tests:
- Test parsing functions with sample HTML
- Test URL normalization with various inputs
- Test file generation with mock data
- Mock Obsidian API for unit tests
- Test rate limiting behavior

## Performance Considerations

- **Rate limiting:** Always respect BibleHub's terms of service
- **Caching:** Cache HTTP responses to avoid duplicate requests
- **Batching:** Process multiple entries efficiently
- **Memory:** Use streams for large files if needed

## Security Notes

- Validate all user inputs
- Sanitize HTML content before processing
- Never expose API keys or sensitive data in notes
- Respect robots.txt and terms of service

## Development Workflow

1. Run `npm run dev` for development
2. Test in Obsidian with sample data
3. Run `npm run typecheck` and `npm run lint` before commits
4. Build with `npm run build` for production
5. Test thoroughly with edge cases and error conditions