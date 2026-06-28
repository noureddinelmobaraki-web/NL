import { useState } from 'react';
import type { CSSProperties } from 'react';
import { getInitials, getHashColor } from '../utils/cover';
import type { Track } from '../engine/types';

const imgStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };

export function TrackCover({ 
  track, 
  size, 
  radius = 8,
  className = '',
  style
}: { 
  track?: Track; 
  size?: number | string; 
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const initials = track ? getInitials(track.title || track.artist || 'NL') : 'NL';
  const bg = track?.coverColor || getHashColor(track?.id || track?.title || 'NL');
  const showImg = track?.coverUrl && !failed;

  const finalSize = size !== undefined ? size : (className ? undefined : 48);

  const wrapStyle: CSSProperties = {
    width: finalSize, 
    height: finalSize, 
    borderRadius: radius, 
    overflow: 'hidden',
    flexShrink: 0, 
    position: 'relative',
    background: `linear-gradient(135deg, ${bg}, rgba(0,0,0,.35))`,
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    ...style
  };
  
  const spanSize = typeof finalSize === 'number' ? finalSize : 48;
  const spanStyle: CSSProperties = {
    color: 'rgba(255,255,255,.92)', 
    fontWeight: 700,
    fontSize: Math.round(spanSize * 0.34), 
    letterSpacing: '.5px',
  };

  return (
    <div style={wrapStyle} className={className}>
      {showImg ? (
        <img
          src={track!.coverUrl}
          alt={track!.title}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={imgStyle}
        />
      ) : (
        <span style={spanStyle}>{initials}</span>
      )}
    </div>
  );
}
