import { describe, expect, it } from 'vitest';
import { THEMES, themeFromSearch } from '../../src/ui/theme';

describe('themes', () => {
  it('defaults to Walnut', () => {
    expect(themeFromSearch('')).toBe('walnut');
    expect(themeFromSearch('?foo=bar')).toBe('walnut');
    expect(THEMES.walnut.light).toBe('#f0d9b5');
    expect(THEMES.walnut.dark).toBe('#b58863');
  });

  it('unlocks Bubblegum Bass with a hyper parameter', () => {
    expect(themeFromSearch('?hyper')).toBe('bubblegum');
    expect(themeFromSearch('?hyper=1')).toBe('bubblegum');
    expect(themeFromSearch('?theme=hyper')).toBe('bubblegum');
    expect(themeFromSearch('?HYPER')).toBe('bubblegum');
    expect(themeFromSearch('?hyperactive=1')).toBe('walnut');
  });

  it('keeps legal moves and snails distinct in every theme', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.legal).not.toBe(t.snail);
      expect(t.legal).not.toBe(t.dark);
      expect(t.snail).not.toBe(t.dark);
    }
  });
});
