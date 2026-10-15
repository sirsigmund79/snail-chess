import '@fontsource/bangers/400.css';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Color } from '../engine/types';

const NAME: Record<Color, string> = { w: 'White', b: 'Black' };

/**
 * GTA-style "WASTED" finale, slime edition: the whole app drains to grey (`slimed-world` on
 * #root) while this layer, portalled to <body> so the filter doesn't touch it, adds the dark
 * band and the lettering. Click anywhere (or press Space) to skip.
 *
 * The lettering is public/slimed.png, pre-rendered in Pricedown (GTA's font) by
 * scripts/render-slimed.ts. Pricedown's free licence doesn't allow embedding the font in an app,
 * only static images. Until that image exists, a Bangers fallback is shown.
 */
export function SlimedOverlay({ victim, by, you, onSkip }: { victim: Color; by: Color; you: Color | null; onSkip: () => void }) {
  const whose = you === victim ? 'Your' : `${NAME[victim]}'s`;
  const [imageMissing, setImageMissing] = useState(false);
  useEffect(() => {
    const root = document.getElementById('root');
    root?.classList.add('slimed-world');
    return () => root?.classList.remove('slimed-world');
  }, []);
  return createPortal(
    <div className="slimed-overlay" role="alert" onClick={onSkip}>
      <div className="slimed-band" />
      <div className="slimed-stack">
        {imageMissing ? (
          <div className="slimed-word" data-testid="slimed">
            slimed
          </div>
        ) : (
          <img
            className="slimed-img"
            data-testid="slimed"
            src={`${import.meta.env.BASE_URL}slimed.png`}
            alt="Slimed"
            onError={() => setImageMissing(true)}
          />
        )}
        <p className="slimed-caption">
          {whose} king was crushed by {NAME[by]}'s snail
        </p>
      </div>
    </div>,
    document.body,
  );
}
