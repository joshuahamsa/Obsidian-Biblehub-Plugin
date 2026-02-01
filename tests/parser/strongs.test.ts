import { describe, it, expect } from '@jest/globals';

import { parseStrongsPage } from '../../src/parser/strongs';
import type { LexiconEntry } from '../../src/types';

// Mock HTML data for testing
const mockGreekHtml = `
<html>
<head><title>G2198 - Bible Hub</title></head>
<body>
<div class="content">
<p><strong>Original Word:</strong> ζάω</p>
<p><strong>Transliteration:</strong> zaó</p>
<p><strong>Phonetic Spelling:</strong> dzah'-o</p>
<p><strong>Pronunciation:</strong> dzah-o</p>
<p><strong>Part of Speech:</strong> verb</p>
<p><strong>Definition:</strong> to live, breathe, be among the living (not merely exist)</p>
<div class="section">
<h2>HELPS Word-studies</h2>
<p>See 2198 for related usage.</p>
</div>
<div class="section">
<h2>Thayer's Greek Lexicon</h2>
<p>1. To live, breathe, be among the living.</p>
</div>
</div>
</body>
</html>
`;

const mockHebrewHtml = `
<html>
<head><title>H1623 - Bible Hub</title></head>
<body>
<div class="content">
<p><strong>Original Word:</strong> גֶּאַר</p>
<p><strong>Transliteration:</strong> gar</p>
<p><strong>Definition:</strong> sojourn, dwell</p>
<div class="section">
<h2>HELPS Word-studies</h2>
<p>See 1624 for related word.</p>
</div>
</div>
</body>
</html>
`;

describe('parser/strongs', () => {
  describe('parseStrongsPage', () => {
    it('should parse Greek Strong entries correctly', () => {
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', mockGreekHtml);
      
      expect(entry.strong).toBe('G2198');
      expect(entry.lang).toBe('greek');
      expect(entry.lemma).toBe('ζάω');
      expect(entry.transliteration).toBe('zaó');
      expect(entry.phonetic).toBe('dzah\'-o');
      expect(entry.pronunciation).toBe('dzah-o');
      expect(entry.part_of_speech).toBe('verb');
      expect(entry.gloss).toBe('to live, breathe, be');
      expect(entry.short_definition).toBe('to live, breathe, be');
      expect(entry.source_primary).toBe('https://biblehub.com/strongs/greek/2198.htm');
      expect(entry.source_alt).toEqual([]);
    });

    it('should parse Hebrew Strong entries correctly', () => {
      const entry = parseStrongsPage('H1623', 'https://biblehub.com/strongs/hebrew/1623.htm', mockHebrewHtml);
      
      expect(entry.strong).toBe('H1623');
      expect(entry.lang).toBe('hebrew');
      expect(entry.lemma).toBe('גֶּאַר');
      expect(entry.transliteration).toBe('gar');
      expect(entry.gloss).toBe('sojourn, dwell');
      expect(entry.part_of_speech).toBeUndefined(); // not present in mock
    });

    it('should extract "See" references and normalize them', () => {
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', mockGreekHtml);
      
      expect(entry.links.see_also).toContain('G2198');
      expect(entry.links.see_also).not.toContain('invalid');
    });

    it('should include all required blocks', () => {
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', mockGreekHtml);
      
      expect(entry.blocks.lexical_summary).toBeDefined();
      expect(entry.blocks.strongs_definition).toBeDefined();
      expect(entry.blocks.helps).toBeDefined();
      expect(entry.blocks.thayers).toBeDefined();
    });

    it('should handle approximate section extraction', () => {
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', mockGreekHtml);
      
      expect(entry.blocks.helps).toContain('HELPS Word-studies');
      expect(entry.blocks.thayers).toContain('Thayer\'s Greek Lexicon');
    });

    it('should handle missing data gracefully', () => {
      const emptyHtml = '<html><body></body></html>';
      const entry = parseStrongsPage('G9999', 'https://biblehub.com/strongs/greek/9999.htm', emptyHtml);
      
      expect(entry.strong).toBe('G9999');
      expect(entry.lang).toBe('greek');
      expect(entry.lemma).toBeUndefined();
      expect(entry.transliteration).toBeUndefined();
      expect(entry.gloss).toBeUndefined();
      expect(entry.blocks.lexical_summary).toBe('');
      expect(entry.links.see_also).toEqual([]);
    });

    it('should generate lexical summary with available fields', () => {
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', mockGreekHtml);
      
      expect(entry.blocks.lexical_summary).toContain('**Lemma:** ζάω');
      expect(entry.blocks.lexical_summary).toContain('**Transliteration:** zaó');
      expect(entry.blocks.lexical_summary).toContain('**Part Of Speech:** verb');
    });

    it('should create short definition correctly', () => {
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', mockGreekHtml);
      
      expect(entry.short_definition).toBe('to live, breathe, be');
    });

    it('should handle definition with punctuation', () => {
      const htmlWithPunctuation = `
        <p><strong>Definition:</strong> life, breathe; exist.</p>
      `;
      const entry = parseStrongsPage('G2198', 'https://biblehub.com/strongs/greek/2198.htm', htmlWithPunctuation);
      
      expect(entry.short_definition).toBe('life, breathe');
    });
  });
});
