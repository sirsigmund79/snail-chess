/**
 * Board/page themes. Paper grey is the default; Bubblegum Bass is a hidden unlock enabled by a
 * `hyper` URL parameter (e.g. `?hyper` or `?theme=hyper`). The unlock is only ever hinted at in
 * the browser console.
 */
export type ThemeId = 'paper' | 'bubblegum';

export interface Theme {
  id: ThemeId;
  name: string;
  light: string;
  dark: string;
  /** Legal-move squares for the selected / dragged piece. */
  legal: string;
  legalDark: string;
  /** Squares the snails land on next. */
  snail: string;
  snailDark: string;
  /** Inset outline on the selected piece's square. */
  selectedRing: string;
  lastMove: string;
  /** Page colours. */
  bg: string;
  ink: string;
  soft: string;
  line: string;
  /** Text on an ink-filled chip (e.g. the current move). */
  onInk: string;
  /** Optional gradient for the wordmark. */
  brand?: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  paper: {
    id: 'paper',
    name: 'Paper grey',
    light: '#ffffff',
    dark: '#e3e3e3',
    legal: '#2e9bff',
    legalDark: '#1f86e6',
    snail: '#ff5a4e',
    snailDark: '#e9483d',
    selectedRing: '#111111',
    lastMove: 'rgba(17, 17, 17, 0.08)',
    bg: '#ffffff',
    ink: '#111111',
    soft: '#8a8a8a',
    line: '#e6e6e6',
    onInk: '#ffffff',
  },
  bubblegum: {
    id: 'bubblegum',
    name: 'Bubblegum Bass',
    light: '#fff0fa',
    dark: '#ff8fd2',
    legal: '#00e1ff',
    legalDark: '#00c4e0',
    snail: '#b8ff1f',
    snailDark: '#a2e612',
    selectedRing: '#2a0033',
    lastMove: 'rgba(42, 0, 51, 0.1)',
    bg: '#ffd3ef',
    ink: '#2a0033',
    soft: '#b0549a',
    line: '#ffb3e4',
    onInk: '#fff0fa',
    brand: 'linear-gradient(90deg, #ff2fa8, #7a3cff)',
  },
};

/** `hyper` as a parameter name or value (case-insensitive) unlocks Bubblegum Bass. */
export function themeFromSearch(search: string): ThemeId {
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    if (key.toLowerCase() === 'hyper' || value.toLowerCase() === 'hyper') return 'bubblegum';
  }
  return 'paper';
}

export const ACTIVE_THEME: Theme =
  THEMES[typeof window === 'undefined' ? 'paper' : themeFromSearch(window.location.search)];

/** Tag <html> with the theme and leave the (console-only) hint for anyone peeking at dev tools. */
export function applyTheme(theme: Theme = ACTIVE_THEME) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const vars: Record<string, string> = {
    '--bg': theme.bg,
    '--ink': theme.ink,
    '--soft': theme.soft,
    '--line': theme.line,
    '--on-ink': theme.onInk,
    '--legal': theme.legal,
    '--snail': theme.snail,
    '--sq-light': theme.light,
    '--sq-dark': theme.dark,
    '--brand': theme.brand ?? 'none',
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  const style = 'font: 600 13px system-ui; color: #ff2fa8';
  if (theme.id === 'bubblegum') {
    console.log('%c🐌 Bubblegum Bass unlocked. Stay hyper.', style);
  } else {
    console.log('%c🐌 psst… try adding ?hyper to the URL.', style);
  }
}
