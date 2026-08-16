import { memo } from 'react';
import { LAMP_HOTSPOT } from '../constants';

interface Props {
  onActivate: () => void;
  /** Dev-only outline so the invisible target can be inspected. */
  debug?: boolean;
}

/**
 * Invisible activation target over the desk lamp.
 *
 * Positioned from the measured shade bounding box. Because the stage is
 * locked to the images' 1:1 aspect, these percentages need no breakpoint
 * adjustment. A real <button> is used so keyboard and screen-reader users
 * can reach it; `min-*` sizes guarantee a 44px touch target on small phones
 * where 13.5% of the stage would otherwise be too small.
 */
export const LampHotspot = memo(function LampHotspot({ onActivate, debug }: Props) {
  const left = LAMP_HOTSPOT.left * 100;
  const top = LAMP_HOTSPOT.top * 100;
  const width = (LAMP_HOTSPOT.right - LAMP_HOTSPOT.left) * 100;
  const height = (LAMP_HOTSPOT.bottom - LAMP_HOTSPOT.top) * 100;

  return (
    <button
      type="button"
      className="nl-portrait-lamp"
      onClick={onActivate}
      aria-label="Turn on the lamp"
      data-debug={debug ? 'true' : undefined}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    />
  );
});
