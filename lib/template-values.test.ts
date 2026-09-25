import { describe, it, expect } from 'vitest';
import { normalizeAdvisories, normalizeLinks } from './template-values';

describe('normalizeAdvisories', () => {
  it('restores a note that JSON.stringify dropped', () => {
    // Exactly what `note: a.note.trim() || undefined` leaves in jsonb:
    // the key is gone, not empty. This is what crashed "Use template".
    const stored = JSON.parse(JSON.stringify([{ code: 'snakes', note: undefined }]));
    expect(stored[0]).not.toHaveProperty('note');
    expect(normalizeAdvisories(stored)).toEqual([{ code: 'snakes', note: '' }]);
  });

  it('keeps a real note', () => {
    expect(normalizeAdvisories([{ code: 'river', note: 'crossing after rain' }])).toEqual([
      { code: 'river', note: 'crossing after rain' },
    ]);
  });

  it('treats an explicit null the same as missing', () => {
    expect(normalizeAdvisories([{ code: 'snakes', note: null }])).toEqual([
      { code: 'snakes', note: '' },
    ]);
  });

  it('survives a column that is null, empty or not an array', () => {
    expect(normalizeAdvisories(null)).toEqual([]);
    expect(normalizeAdvisories(undefined)).toEqual([]);
    expect(normalizeAdvisories([])).toEqual([]);
    expect(normalizeAdvisories('nonsense')).toEqual([]);
    expect(normalizeAdvisories({ code: 'not-an-array' })).toEqual([]);
  });

  it('drops entries with no usable code rather than rendering a broken row', () => {
    expect(normalizeAdvisories([{ note: 'orphan' }, null, { code: 7 }, { code: 'ok' }])).toEqual([
      { code: 'ok', note: '' },
    ]);
  });
});

describe('normalizeLinks', () => {
  it('restores a label that JSON.stringify dropped', () => {
    const stored = JSON.parse(JSON.stringify([{ url: 'https://x.cr', label: undefined }]));
    expect(stored[0]).not.toHaveProperty('label');
    expect(normalizeLinks(stored)).toEqual([{ url: 'https://x.cr', label: '' }]);
  });

  it('keeps a real label and handles null', () => {
    expect(
      normalizeLinks([
        { url: 'https://a.cr', label: 'Hotel' },
        { url: 'https://b.cr', label: null },
      ])
    ).toEqual([
      { url: 'https://a.cr', label: 'Hotel' },
      { url: 'https://b.cr', label: '' },
    ]);
  });

  it('survives a column that is null or not an array', () => {
    expect(normalizeLinks(null)).toEqual([]);
    expect(normalizeLinks('nonsense')).toEqual([]);
  });

  it('drops entries with no usable url', () => {
    expect(normalizeLinks([{ label: 'no url' }, { url: 'https://ok.cr' }])).toEqual([
      { url: 'https://ok.cr', label: '' },
    ]);
  });
});
