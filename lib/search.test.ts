import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm } from './search';

describe('sanitizeSearchTerm', () => {
  it('passes through an ordinary term', () => {
    expect(sanitizeSearchTerm('Chirripó')).toBe('Chirripó');
  });

  it('keeps accents and ñ, which most CR place names need', () => {
    expect(sanitizeSearchTerm('Peñas Blancas')).toBe('Peñas Blancas');
  });

  it('trims and collapses whitespace', () => {
    expect(sanitizeSearchTerm('  cerro   chirripo  ')).toBe('cerro chirripo');
  });

  it('strips the PostgREST or() separators that would break the filter', () => {
    // A comma would split this into two filter conditions.
    expect(sanitizeSearchTerm('Chirripó, Costa Rica')).toBe('Chirripó Costa Rica');
    expect(sanitizeSearchTerm('hike (easy)')).toBe('hike easy');
    expect(sanitizeSearchTerm('say "hi"')).toBe('say hi');
  });

  it('strips ilike wildcards so a bare % does not match everything', () => {
    expect(sanitizeSearchTerm('%')).toBeNull();
    expect(sanitizeSearchTerm('be%ach')).toBe('be ach');
    expect(sanitizeSearchTerm('a_b')).toBe('a b');
  });

  it('rejects terms too short to be worth a query', () => {
    expect(sanitizeSearchTerm('')).toBeNull();
    expect(sanitizeSearchTerm('   ')).toBeNull();
    expect(sanitizeSearchTerm('a')).toBeNull();
  });

  it('caps length so the term cannot become a payload', () => {
    const result = sanitizeSearchTerm('x'.repeat(500));
    expect(result).toHaveLength(80);
  });

  it('returns null when only unsafe characters were supplied', () => {
    expect(sanitizeSearchTerm(',,,')).toBeNull();
    expect(sanitizeSearchTerm('()')).toBeNull();
  });
});
