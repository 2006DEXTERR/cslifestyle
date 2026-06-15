import { describe, it, expect } from 'vitest';
import { tokenize, editDistance } from '../../src/services/discovery/search.service';

describe('search tokenizer', () => {
  it('lowercases, strips punctuation, drops stopwords + single chars', () => {
    expect(tokenize('The BEST iPhone-15, Pro!')).toEqual(['iphone', '15', 'pro']);
    expect(tokenize('a or the')).toEqual([]);
  });
});

describe('fuzzy edit distance', () => {
  it('computes Levenshtein distance', () => {
    expect(editDistance('iphone', 'iphone')).toBe(0);
    expect(editDistance('iphon', 'iphone')).toBe(1); // one insertion
    expect(editDistance('samsng', 'samsung')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });

  it('short-circuits very different lengths', () => {
    expect(editDistance('a', 'abcdef')).toBe(99);
  });
});
