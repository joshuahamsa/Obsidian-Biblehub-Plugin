import { describe, it, expect } from '@jest/globals';

import { normalizeStrongId, langFromStrong, strongsUrl, langPageUrl, safeFileName } from '../src/normalize';

describe('normalize', () => {
  describe('normalizeStrongId', () => {
    it('should normalize Greek Strong IDs with G prefix', () => {
      expect(normalizeStrongId('G2198')).toBe('G2198');
      expect(normalizeStrongId('g2198')).toBe('G2198');
      expect(normalizeStrongId('G 02198')).toBe('G2198');
    });

    it('should normalize Hebrew Strong IDs with H prefix', () => {
      expect(normalizeStrongId('H1623')).toBe('H1623');
      expect(normalizeStrongId('h1623')).toBe('H1623');
      expect(normalizeStrongId('H 01623')).toBe('H1623');
    });

    it('should handle bare numbers with language hint', () => {
      expect(normalizeStrongId('2198', 'greek')).toBe('G2198');
      expect(normalizeStrongId('1623', 'hebrew')).toBe('H1623');
    });

    it('should return null for invalid inputs', () => {
      expect(normalizeStrongId('invalid')).toBeNull();
      expect(normalizeStrongId('')).toBeNull();
      expect(normalizeStrongId('123456')).toBeNull(); // too long
    });
  });

  describe('langFromStrong', () => {
    it('should identify Greek Strong IDs', () => {
      expect(langFromStrong('G2198')).toBe('greek');
      expect(langFromStrong('g123')).toBe('greek');
    });

    it('should identify Hebrew Strong IDs', () => {
      expect(langFromStrong('H1623')).toBe('hebrew');
      expect(langFromStrong('h123')).toBe('hebrew');
    });
  });

  describe('strongsUrl', () => {
    it('should generate Greek Strong URLs', () => {
      expect(strongsUrl('G2198')).toBe('https://biblehub.com/strongs/greek/2198.htm');
      expect(strongsUrl('g123')).toBe('https://biblehub.com/strongs/greek/123.htm');
    });

    it('should generate Hebrew Strong URLs', () => {
      expect(strongsUrl('H1623')).toBe('https://biblehub.com/strongs/hebrew/1623.htm');
      expect(strongsUrl('h123')).toBe('https://biblehub.com/strongs/hebrew/123.htm');
    });
  });

  describe('langPageUrl', () => {
    it('should generate Greek language page URLs', () => {
      expect(langPageUrl('G2198')).toBe('https://biblehub.com/greek/2198.htm');
      expect(langPageUrl('g123')).toBe('https://biblehub.com/greek/123.htm');
    });

    it('should generate Hebrew language page URLs', () => {
      expect(langPageUrl('H1623')).toBe('https://biblehub.com/hebrew/1623.htm');
      expect(langPageUrl('h123')).toBe('https://biblehub.com/hebrew/123.htm');
    });
  });

  describe('safeFileName', () => {
    it('should remove invalid file characters', () => {
      expect(safeFileName('G2198 — ζάω (zaó)')).toBe('G2198 — ζάω (zaó)');
      expect(safeFileName('test/file:name')).toBe('test—file—name');
      expect(safeFileName('test?file*name')).toBe('test—file—name');
    });

    it('should normalize whitespace', () => {
      expect(safeFileName('  G2198   —   test  ')).toBe('G2198 — test');
    });

    it('should trim whitespace', () => {
      expect(safeFileName('  filename  ')).toBe('filename');
    });
  });
});
