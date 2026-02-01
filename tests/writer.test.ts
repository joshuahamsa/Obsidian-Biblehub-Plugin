import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { Writer } from '../src/writer';
import type { LexiconEntry, Recipe } from '../src/types';
import { TFile } from 'obsidian';

// Mock Obsidian Vault
const mockVault = {
  getAbstractFileByPath: jest.fn(),
  create: jest.fn(),
  read: jest.fn(),
  modify: jest.fn(),
  createFolder: jest.fn(),
  getMarkdownFiles: jest.fn(),
  adapter: {
    exists: jest.fn()
  }
} as any;

const mockTFile = {
  basename: 'test-file',
  path: 'test-path'
};

describe('Writer', () => {
  let writer: Writer;
  let mockRecipe: Recipe;

  beforeEach(() => {
    writer = new Writer(mockVault);
    mockRecipe = {
      id: 'test-recipe',
      includeSections: ['lexical_summary', 'strongs_definition'],
      followEdges: ['see_also'],
      maxDepth: 2,
      maxNodes: 10,
      rateLimitMs: 1000,
      skipExisting: false,
      rootFolder: 'Test/Lexicon',
      noteTitlePattern: '{{strong}} — {{lemma}} — {{short_definition}}'
    };
    
    jest.clearAllMocks();
  });

  describe('buildTitle', () => {
    it('should build title with all available fields', () => {
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        lemma: 'ζάω',
        transliteration: 'zaó',
        short_definition: 'to live',
        gloss: 'life',
        source_primary: 'test-url',
        source_alt: [],
        blocks: {},
        links: { see_also: [], related_strongs: [], topical: [] }
      };

      const title = writer.buildTitle(entry, mockRecipe);
      expect(title).toBe('G2198 — ζάω — to live');
    });

    it('should handle missing fields gracefully', () => {
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        source_primary: 'test-url',
        source_alt: [],
        blocks: {},
        links: { see_also: [], related_strongs: [], topical: [] }
      };

      const title = writer.buildTitle(entry, mockRecipe);
      expect(title).toBe('G2198 — —');
    });
  });

  describe('filePath', () => {
    it('should construct correct file path', () => {
      const path = writer.filePath('Test Title', mockRecipe);
      expect(path).toBe('Test/Lexicon/Test Title.md');
    });

    it('should handle root folder with slashes', () => {
      const recipeWithSlashes = { ...mockRecipe, rootFolder: '/Test/Lexicon/' };
      const path = writer.filePath('Test Title', recipeWithSlashes);
      expect(path).toBe('Test/Lexicon/Test Title.md');
    });
  });

  describe('renderNew', () => {
    it('should create complete YAML frontmatter', () => {
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        lemma: 'ζάω',
        transliteration: 'zaó',
        pronunciation: 'dzah-o',
        phonetic: 'dzah\'-o',
        part_of_speech: 'verb',
        gloss: 'life',
        short_definition: 'to live',
        source_primary: 'https://biblehub.com/strongs/greek/2198.htm',
        source_alt: ['https://biblehub.com/greek/2198.htm'],
        blocks: {
          lexical_summary: '- **Original Word:** ζάω\n- **Part of Speech:** verb',
          strongs_definition: 'to live, breathe',
          helps: 'See 2198 for related usage',
          thayers: '1. To live, breathe'
        },
        links: { 
          see_also: ['G2199'], 
          related_strongs: ['G2222'], 
          topical: ['T123'] 
        }
      };

      // Access private method through reflection for testing
      const content = (writer as any).renderNew(entry, mockRecipe);
      
      expect(content).toContain('type: lexicon/strongs');
      expect(content).toContain('strong: G2198');
      expect(content).toContain('lang: greek');
      expect(content).toContain('lemma: ζάω');
      expect(content).toContain('transliteration: zaó');
      expect(content).toContain('source_primary: https://biblehub.com/strongs/greek/2198.htm');
      expect(content).toContain('import_recipe: test-recipe');
      expect(content).toContain('links_see_also:');
      expect(content).toContain('- "[[G2199]]"');
    });

    it('should include all sections in body', () => {
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        lemma: 'ζάω',
        source_primary: 'test-url',
        source_alt: [],
        blocks: {
          lexical_summary: 'Test summary',
          strongs_definition: 'Test definition',
          helps: 'Test helps',
          thayers: 'Test thayers'
        },
        links: { see_also: [], related_strongs: [], topical: [] }
      };

      const content = (writer as any).renderNew(entry, mockRecipe);
      
      expect(content).toContain('## Lexical Summary');
      expect(content).toContain('<!-- imported: lexical_summary -->');
      expect(content).toContain('## Strong\'s Definition');
      expect(content).toContain('## HELPS Word-studies');
      expect(content).toContain('## Thayer\'s Lexicon');
      expect(content).toContain('## Outbound Links');
    });
  });

  describe('ensureFolder', () => {
    it('should create folder if it does not exist', async () => {
      mockVault.adapter.exists.mockResolvedValue(false);
      mockVault.createFolder.mockResolvedValue(undefined as any);
      
      await writer.ensureFolder(mockRecipe);
      
      expect(mockVault.adapter.exists).toHaveBeenCalledWith('Test/Lexicon');
      expect(mockVault.createFolder).toHaveBeenCalledWith('Test/Lexicon');
    });

    it('should not create folder if it already exists', async () => {
      mockVault.adapter.exists.mockResolvedValue(true);
      
      await writer.ensureFolder(mockRecipe);
      
      expect(mockVault.adapter.exists).toHaveBeenCalledWith('Test/Lexicon');
      expect(mockVault.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    beforeEach(() => {
      mockVault.getAbstractFileByPath.mockReturnValue(null);
      mockVault.adapter.exists.mockResolvedValue(true);
      mockVault.create.mockResolvedValue(mockTFile as any);
    });

    it('should create new file if none exists', async () => {
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        source_primary: 'test-url',
        source_alt: [],
        blocks: {},
        links: { see_also: [], related_strongs: [], topical: [] }
      };

      const result = await writer.upsert(entry, mockRecipe, false);
      
      expect(mockVault.getAbstractFileByPath).toHaveBeenCalled();
      expect(mockVault.create).toHaveBeenCalled();
      expect(result.created).toBe(true);
      expect(result.file).toBe(mockTFile);
    });

    it('should update existing file if it exists', async () => {
      const existingFile = new (TFile as any)('Test/Lexicon/G2198.md');
      mockVault.getAbstractFileByPath.mockReturnValue(existingFile);
      mockVault.read.mockResolvedValue('## Lexical Summary\n<!-- imported: lexical_summary -->\n');
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        source_primary: 'test-url',
        source_alt: [],
        blocks: {
          lexical_summary: 'Original content',
          strongs_definition: 'Original definition'
        },
        links: { see_also: [], related_strongs: [], topical: [] }
      };

      const result = await writer.upsert(entry, mockRecipe, false);
      
      expect(result.created).toBe(false);
      expect(result.file).toBe(existingFile);
      expect(mockVault.modify).toHaveBeenCalled();
    });
  });

  describe('safeFileName utility (integrated testing)', () => {
    it('should handle complex Unicode and special characters', () => {
      const entry: LexiconEntry = {
        strong: 'G2198',
        lang: 'greek',
        lemma: 'ζάω test/file:name*special?',
        source_primary: 'test-url',
        source_alt: [],
        blocks: {},
        links: { see_also: [], related_strongs: [], topical: [] }
      };

      const title = writer.buildTitle(entry, mockRecipe);
      expect(title).not.toContain('/');
      expect(title).not.toContain('*');
      expect(title).not.toContain('?');
    });
  });
});
