import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { Crawler } from '../src/crawler';
import type { CrawlResult, LexiconEntry, Recipe } from '../src/types';

jest.mock('../src/parser', () => ({
  parseEntryFromStrongsPage: jest.fn()
}));

import { parseEntryFromStrongsPage } from '../src/parser';

const makeEntry = (strong: string, seeAlso: string[] = []): LexiconEntry => ({
  strong,
  lang: strong.startsWith('G') ? 'greek' : 'hebrew',
  source_primary: `https://biblehub.com/strongs/${strong.startsWith('G') ? 'greek' : 'hebrew'}/${strong.slice(1)}.htm`,
  source_alt: [],
  blocks: {},
  links: {
    see_also: seeAlso,
    related_strongs: [],
    topical: []
  }
});

describe('Crawler smoke test', () => {
  const mockVault = {
    getMarkdownFiles: jest.fn(() => []),
  } as any;

  const mockFetcher = {
    setRateLimit: jest.fn(),
    get: jest.fn(async () => '<html></html>')
  } as any;

  const mockWriter = {
    upsert: jest.fn(async () => ({ file: {}, created: true }))
  } as any;

  const recipe: Recipe = {
    id: 'test-recipe',
    includeSections: ['lexical_summary'],
    followEdges: ['see_also'],
    maxDepth: 2,
    maxNodes: 10,
    rateLimitMs: 0,
    skipExisting: false,
    rootFolder: 'Test/Lexicon',
    noteTitlePattern: '{{strong}}'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crawls breadth-first using typed edges', async () => {
    const parseMock = parseEntryFromStrongsPage as jest.Mock;
    parseMock.mockImplementation((strong: string) => {
      if (strong === 'G1') return makeEntry('G1', ['G2', 'G3']);
      if (strong === 'G2') return makeEntry('G2', ['G4']);
      if (strong === 'G3') return makeEntry('G3');
      return makeEntry(strong);
    });

    const crawler = new Crawler(mockVault, mockFetcher, mockWriter);
    const result: CrawlResult = await crawler.run('G1', recipe, false);

    expect(mockFetcher.setRateLimit).toHaveBeenCalledWith(0);
    expect(mockFetcher.get).toHaveBeenCalledTimes(4);
    expect(mockWriter.upsert).toHaveBeenCalledTimes(4);
    expect(result.created).toBe(4);
    expect(result.errors).toHaveLength(0);
  });

  it('respects maxDepth and maxNodes', async () => {
    const parseMock = parseEntryFromStrongsPage as jest.Mock;
    parseMock.mockImplementation((strong: string) => {
      if (strong === 'G1') return makeEntry('G1', ['G2', 'G3']);
      if (strong === 'G2') return makeEntry('G2', ['G4']);
      return makeEntry(strong);
    });

    const crawler = new Crawler(mockVault, mockFetcher, mockWriter);
    const limitedRecipe: Recipe = { ...recipe, maxDepth: 1, maxNodes: 2 };
    const result = await crawler.run('G1', limitedRecipe, false);

    expect(mockFetcher.get).toHaveBeenCalledTimes(2);
    expect(mockWriter.upsert).toHaveBeenCalledTimes(2);
    expect(result.created).toBe(2);
  });
});
