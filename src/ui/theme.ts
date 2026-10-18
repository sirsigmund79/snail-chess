/**
 * Board/page themes. Walnut (dark, easy on the eyes for long sessions and streams) is the default;
 * Bubblegum Bass is a hidden unlock enabled by a
 * `hyper` URL parameter (e.g. `?hyper` or `?theme=hyper`). The unlock is only ever hinted at in
 * the browser console.
 */
export type ThemeId = 'walnut' | 'bubblegum';

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
  lastMoveDark: string;
  /** Page colours. */
  bg: string;
  /** Raised panels: sheets, the result card, the toolbar. */
  surface: string;
  ink: string;
  soft: string;
  line: string;
  /** Text on an ink-filled chip (e.g. the current move). */
  onInk: string;
  /** Optional gradient for the wordmark. */
  brand?: string;
  colorScheme: 'light' | 'dark';
  /** Snail icons off the board (on the board they always use the light-page colours). */
  icon: { foot: string; whiteShell: string; whiteSpiral: string; blackShell: string; blackSpiral: string };
}

/** Snail icon colours for light pages: white shell, ink outline. */
const LIGHT_ICON = { foot: '#f4f4f4', whiteShell: '#ffffff', whiteSpiral: 'var(--ink)', blackShell: 'var(--ink)', blackSpiral: '#ffffff' };

export const THEMES: Record<ThemeId, Theme> = {
  walnut: {
    id: 'walnut',
    name: 'Walnut',
    light: '#f0d9b5',
    dark: '#b58863',
    legal: '#8bbbe6',
    legalDark: '#41709f',
    snail: '#e8735a',
    snailDark: '#a9452f',
    selectedRing: '#1b1714',
    lastMove: '#e3cf7f',
    lastMoveDark: '#b8a14e',
    bg: '#1b1714',
    surface: '#252019',
    ink: '#ece2d0',
    soft: '#a8987f',
    line: '#3a3128',
    onInk: '#1b1714',
    colorScheme: 'dark',
    icon: { foot: '#252019', whiteShell: '#ece2d0', whiteSpiral: '#1b1714', blackShell: '#1b1714', blackSpiral: '#ece2d0' },
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
    lastMoveDark: 'rgba(42, 0, 51, 0.1)',
    bg: '#ffd3ef',
    surface: '#ffd3ef',
    ink: '#2a0033',
    soft: '#b0549a',
    line: '#ffb3e4',
    onInk: '#fff0fa',
    brand: 'linear-gradient(90deg, #ff2fa8, #7a3cff)',
    colorScheme: 'light',
    icon: LIGHT_ICON,
  },
};

/** `hyper` as a parameter name or value (case-insensitive) unlocks Bubblegum Bass. */
export function themeFromSearch(search: string): ThemeId {
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    if (key.toLowerCase() === 'hyper' || value.toLowerCase() === 'hyper') return 'bubblegum';
  }
  return 'walnut';
}

export const ACTIVE_THEME: Theme =
  THEMES[typeof window === 'undefined' ? 'walnut' : themeFromSearch(window.location.search)];

/** Tag <html> with the theme and leave the (console-only) hint for anyone peeking at dev tools. */
export function applyTheme(theme: Theme = ACTIVE_THEME) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const vars: Record<string, string> = {
    '--bg': theme.bg,
    '--surface': theme.surface,
    '--ink': theme.ink,
    '--soft': theme.soft,
    '--line': theme.line,
    '--on-ink': theme.onInk,
    '--legal': theme.legal,
    '--snail': theme.snail,
    '--sq-light': theme.light,
    '--sq-dark': theme.dark,
    '--brand': theme.brand ?? 'none',
    '--icon-foot': theme.icon.foot,
    '--icon-w-shell': theme.icon.whiteShell,
    '--icon-w-spiral': theme.icon.whiteSpiral,
    '--icon-b-shell': theme.icon.blackShell,
    '--icon-b-spiral': theme.icon.blackSpiral,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = theme.colorScheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  const style = 'font: 600 13px system-ui; color: #ff2fa8';
  if (theme.id === 'bubblegum') {
    console.log('%c🐌 Bubblegum Bass unlocked. Stay hyper.', style);
  } else {
    console.log('%c🐌 psst… try adding ?hyper to the URL.', style);
  }
}
