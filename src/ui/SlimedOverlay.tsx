import '@fontsource/bangers/400.css';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Color } from '../engine/types';

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };

/** Slime drips hanging off the lettering: [left %, width px, length px, delay ms]. */
const DRIPS: [number, number, number, number][] = [
  [9, 14, 50, 900],
  [21, 10, 32, 1150],
  [34, 18, 66, 1000],
  [52, 12, 40, 1300],
  [63, 16, 58, 1050],
  [78, 11, 36, 1250],
  [90, 15, 52, 1100],
];

/**
 * GTA-style "WASTED" finale, slime edition: the whole app drains to grey (`slimed-world` on
 * #root) while this layer, portalled to <body> so the filter doesn't touch it, adds the dark
 * band, the lettering and the drips. Click anywhere (or press Space) to skip.
 */
export function SlimedOverlay({ victim, by, you, onSkip }: { victim: Color; by: Color; you: Color | null; onSkip: () => void }) {
  const whose = you === victim ? 'Your' : `${NAME[victim]}'s`;
  useEffect(() => {
    const root = document.getElementById('root');
    root?.classList.add('slimed-world');
    return () => root?.classList.remove('slimed-world');
  }, []);
  return createPortal(
    <div className="slimed-overlay" role="alert" onClick={onSkip}>
      <div className="slimed-band" />
      <div className="slimed-stack">
        <div className="slimed-word" data-testid="slimed">
          slimed
          <span className="slimed-drips" aria-hidden>
            {DRIPS.map(([left, w, h, delay]) => (
              <span
                key={left}
                className="slimed-drip"
                style={{ left: `${left}%`, width: w, height: h, animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </div>
        <p className="slimed-caption">
          {whose} king was crushed by {NAME[by]}'s snail
        </p>
      </div>
    </div>,
    document.body,
  );
}
