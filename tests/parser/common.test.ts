import { describe, it, expect } from '@jest/globals';

import { htmlToText, pickLabel, escapeRegExp } from '../../src/parser/common';

describe('parser/common', () => {
  describe('htmlToText', () => {
    it('should strip HTML tags', () => {
      expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
      expect(htmlToText('<div>Test</div>')).toBe('Test');
      expect(htmlToText('<br/>Line<br/>break')).toBe('Line\nbreak');
    });

    it('should decode HTML entities', () => {
      expect(htmlToText('&amp; &lt; &gt; &quot; &#39;')).toBe('& &lt; &gt; " \'');
      expect(htmlToText('&nbsp;test&nbsp;')).toBe('test');
    });

    it('should remove scripts and styles', () => {
      expect(htmlToText('<script>alert("x")</script>Text')).toBe('Text');
      expect(htmlToText('<style>body { color: red; }</style>Text')).toBe('Text');
    });

    it('should normalize whitespace', () => {
      expect(htmlToText('  <p>  Hello   World  </p>  ')).toBe('Hello   World');
      expect(htmlToText('<div>Line1\n\n\nLine2</div>')).toBe('Line1\n\nLine2');
    });
  });

  describe('pickLabel', () => {
    it('should extract label values', () => {
      const text = 'Original Word: ζάω\nDefinition: life';
      expect(pickLabel(text, 'Original Word')).toBe('ζάω');
      expect(pickLabel(text, 'Definition')).toBe('life');
    });

    it('should handle case insensitive matching', () => {
      const text = 'original word: ζάω';
      expect(pickLabel(text, 'Original Word')).toBe('ζάω');
    });

    it('should return undefined for missing labels', () => {
      const text = 'Some text without labels';
      expect(pickLabel(text, 'Original Word')).toBeUndefined();
    });

    it('should trim extracted values', () => {
      const text = 'Original Word:   ζάω   ';
      expect(pickLabel(text, 'Original Word')).toBe('ζάω');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegExp('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
      expect(escapeRegExp('test.123')).toBe('test\\.123');
      expect(escapeRegExp('simple')).toBe('simple');
    });

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('');
    });

    it('should handle complex patterns', () => {
      expect(escapeRegExp('a.*b?c+d')).toBe('a\\.\\*b\\?c\\+d');
    });
  });
});
