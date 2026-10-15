import { describe, expect, it } from 'vitest';
import { THEMES, themeFromSearch } from '../../src/ui/theme';

describe('themes', () => {
  it('defaults to paper grey', () => {
    expect(themeFromSearch('')).toBe('paper');
    expect(themeFromSearch('?foo=bar')).toBe('paper');
    expect(THEMES.paper.dark).toBe('#e3e3e3');
  });

  it('unlocks Bubblegum Bass with a hyper parameter', () => {
    expect(themeFromSearch('?hyper')).toBe('bubblegum');
    expect(themeFromSearch('?hyper=1')).toBe('bubblegum');
    expect(themeFromSearch('?theme=hyper')).toBe('bubblegum');
    expect(themeFromSearch('?HYPER')).toBe('bubblegum');
    expect(themeFromSearch('?hyperactive=1')).toBe('paper');
  });

  it('keeps legal moves and snails distinct in every theme', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.legal).not.toBe(t.snail);
      expect(t.legal).not.toBe(t.dark);
      expect(t.snail).not.toBe(t.dark);
    }
  });
});
