import { useState, useEffect } from 'react';
import { ASSETS } from '../../constants/assets';

export const CrossfadeImage = () => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActive(p => p === 0 ? 1 : 0), 2000);
    return () => clearInterval(interval);
  }, []);
  const images = [ASSETS.gallery.draw1, ASSETS.gallery.draw2];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Drawing preview ${i + 1}`}
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain', borderRadius: '8px',
            opacity: active === i ? 1 : 0,
            transition: 'opacity 1000ms ease-in-out',
            background: 'var(--bg-elevated, black)'
          }}
        />
      ))}
    </div>
  );
};
