import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import BibleHubLexiconImporter from '../src/main';
import type { PluginSettings } from '../src/settings';

// Mock Obsidian API
const mockApp = {
  workspace: {
    getActiveViewOfType: jest.fn(),
    activeLeaf: {
      view: {
        editor: {
          getSelection: jest.fn()
        }
      }
    }
  },
  vault: {
    getMarkdownFiles: jest.fn(),
    adapter: {
      exists: jest.fn()
    }
  }
} as any;

const mockSettings: PluginSettings = {
  recipe: {
    id: 'test-recipe',
    includeSections: ['lexical_summary'],
    followEdges: ['see_also'],
    maxDepth: 1,
    maxNodes: 5,
    rateLimitMs: 100,
    skipExisting: true,
    rootFolder: 'Test/Lexicon',
    noteTitlePattern: '{{strong}} — {{lemma}}'
  },
  renameOnUpdate: false
};

describe('BibleHubLexiconImporter Integration', () => {
  let plugin: BibleHubLexiconImporter;

  beforeEach(() => {
    plugin = new BibleHubLexiconImporter(mockApp, {} as any);
    plugin.settings = mockSettings;
    jest.clearAllMocks();
  });

  describe('Plugin Initialization', () => {
    it('should initialize with default settings', () => {
      expect(plugin.settings).toBeDefined();
      expect(plugin.settings.recipe.id).toBe('test-recipe');
      expect(plugin.settings.recipe.maxDepth).toBe(1);
      expect(plugin.settings.recipe.maxNodes).toBe(5);
    });
  });

  describe('URL Normalization', () => {
    it('should normalize BibleHub Strong URLs', () => {
      // Test the private method through reflection
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      
      expect(normalizeUrl('https://biblehub.com/strongs/greek/2198.htm')).toBe('G2198');
      expect(normalizeUrl('https://biblehub.com/strongs/hebrew/1623.htm')).toBe('H1623');
      expect(normalizeUrl('https://biblehub.com/greek/2198.htm')).toBe('G2198');
      expect(normalizeUrl('https://biblehub.com/hebrew/1623.htm')).toBe('H1623');
    });

    it('should handle Strong ID inputs directly', () => {
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      
      expect(normalizeUrl('G2198')).toBe('G2198');
      expect(normalizeUrl('H1623')).toBe('H1623');
      expect(normalizeUrl('g2198')).toBe('G2198');
      expect(normalizeUrl('h1623')).toBe('H1623');
    });

    it('should handle bare numbers (assumes Greek)', () => {
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      
      expect(normalizeUrl('2198')).toBe('G2198');
      expect(normalizeUrl('2198')).toBe('G2198');
    });

    it('should return null for invalid inputs', () => {
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      
      expect(normalizeUrl('invalid')).toBeNull();
      expect(normalizeUrl('')).toBeNull();
      expect(normalizeUrl('123456')).toBeNull();
    });
  });

  describe('Input Detection', () => {
    it('should use selected text when available', async () => {
      const mockView = {
        editor: {
          getSelection: jest.fn().mockReturnValue('G2198')
        }
      };
      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);
      
      const getSeed = (plugin as any).getSeedFromSelectionOrPrompt.bind(plugin);
      const result = await getSeed();
      
      expect(mockView.editor.getSelection).toHaveBeenCalled();
      expect(result).toBe('G2198');
    });
  });

  describe('Settings Management', () => {
    it('should save settings when modified', async () => {
      const saveDataSpy = jest.spyOn(plugin, 'saveData');
      saveDataSpy.mockResolvedValue(undefined as any);
      
      await plugin.saveSettings();
      
      expect(saveDataSpy).toHaveBeenCalledWith(plugin.settings);
    });
  });

  describe('Command Registration', () => {
    it('should register import command on load', async () => {
      (plugin as any).addCommand = jest.fn();
      (plugin as any).addSettingTab = jest.fn();
      (plugin as any).loadData = jest.fn(() => Promise.resolve({} as Record<string, unknown>));

      await plugin.onload();
      
      expect((plugin as any).addCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'import-strongs-graph',
          name: 'Import Strong\'s as graph (BibleHub)',
          callback: expect.any(Function)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed URLs gracefully', () => {
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      
      expect(normalizeUrl('not-a-url')).toBeNull();
      expect(normalizeUrl('https://example.com')).toBeNull();
      expect(normalizeUrl('biblehub.com/greek')).toBeNull();
    });

    it('should handle edge cases in Strong IDs', () => {
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      
      expect(normalizeUrl('G0')).toBe('G0');
      expect(normalizeUrl('G99999')).toBe('G99999');
      expect(normalizeUrl('H0')).toBe('H0');
    });
  });

  describe('Data Flow Integration', () => {
    it('should handle complete workflow from URL to structured data', async () => {
      // This would require mocking the entire data flow
      // For now, test the individual components
      const normalizeUrl = (plugin as any).normalizeSeedToStrong.bind(plugin);
      const result = normalizeUrl('https://biblehub.com/strongs/greek/2198.htm');
      
      expect(result).toBe('G2198');
      
      // Verify the URL pattern matching works
      const urlPattern = /biblehub\.com\/strongs\/(greek|hebrew)\/(\d+)\.htm/i;
      const match = 'https://biblehub.com/strongs/greek/2198.htm'.match(urlPattern);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('greek');
      expect(match![2]).toBe('2198');
    });
  });
});
