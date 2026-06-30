import { useState } from 'react';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Windows XP-style speaker icon button.
 * Inline SVG = no external dependency, fully theme-able, pixel-perfect.
 */
export const IntroSpeakerButton = ({ enabled, onToggle }: Props) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={enabled ? 'Mute intro music' : 'Enable intro music'}
      aria-pressed={enabled}
      className="nl-speaker-btn"
      style={{
        position: 'absolute',
        top: 14, right: 14,
        width: 48, height: 48,
        background: hover
          ? 'linear-gradient(180deg, #f0f4ff 0%, #c8d4ff 100%)'
          : 'linear-gradient(180deg, #e6ecff 0%, #b8c4eb 100%)',
        border: '2px outset #88a0d8',
        boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #5a6f9e, 2px 2px 6px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        padding: 6,
        zIndex: 10,
        imageRendering: 'pixelated',
        outline: 'none',
        borderRadius: 3,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        {/* Speaker body (XP teal-grey) */}
        <rect x="2" y="6" width="2" height="4" fill="#3a5a8a"/>
        <polygon points="4,6 7,3 7,13 4,10" fill="#5a7ab8"/>
        <polygon points="4,6 7,3 7,13 4,10" fill="none" stroke="#1a2a4a" strokeWidth="0.5"/>
        {/* Sound waves — only when enabled */}
        {enabled && (
          <>
            <path d="M9 5 Q11 8 9 11" stroke="#1a2a4a" strokeWidth="1" fill="none"/>
            <path d="M11 3 Q14 8 11 13" stroke="#1a2a4a" strokeWidth="1" fill="none"/>
          </>
        )}
        {/* Red X overlay when muted */}
        {!enabled && (
          <>
            <line x1="9" y1="4" x2="14" y2="12" stroke="#c00" strokeWidth="1.5"/>
            <line x1="14" y1="4" x2="9" y2="12" stroke="#c00" strokeWidth="1.5"/>
          </>
        )}
      </svg>
    </button>
  );
};
