import type { Color } from '../engine/types';

/**
 * The flat snail used everywhere (board, move dots, move strip, wordmark). White's snail has a
 * white shell, Black's a dark one; outlines use the theme ink.
 */
export function SnailIcon({ side, className = '', title }: { side: Color; className?: string; title?: string }) {
  return (
    <svg className={`snail-icon snail-${side} ${className}`} viewBox="0 0 40 40" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <rect x="5" y="25" width="30" height="8" rx="4" className="snail-foot" />
      <path d="M30 26 L33 15 M33 26 L37 17" className="snail-horn" />
      <circle cx="18" cy="20" r="11" className="snail-shell" />
      <path d="M18 20 m0-2.5 a2.5 2.5 0 1 1 -2.5 2.5 a5 5 0 0 1 5 -5 a7.5 7.5 0 0 1 7.5 7.5" className="snail-spiral" />
    </svg>
  );
}
