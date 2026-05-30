import React, { useState, useEffect } from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  widths?: number[];
  formats?: string[];
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  style?: React.CSSProperties;
  dataLqip?: string;
}

// Module-level cache for the LQIP Manifest
let lqipManifest: Record<string, string> | null = null;
let manifestPromise: Promise<Record<string, string>> | null = null;

function loadLqipManifest(): Promise<Record<string, string>> {
  if (lqipManifest) return Promise.resolve(lqipManifest);
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetch('/data/lqip-manifest.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load LQIP manifest');
      return res.json();
    })
    .then((data) => {
      lqipManifest = data;
      return data;
    })
    .catch((err) => {
      console.warn('[LQIP] Manifest failed to load:', err);
      lqipManifest = {};
      return {};
    });

  return manifestPromise;
}

/**
 * ResponsiveImage component that utilizes <picture> for multi-format and responsive delivery.
 * Assumes that optimized assets are generated at build time with filename convention: [name]-[width].[format]
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  style,
  dataLqip
}) => {
  const [lqip, setLqip] = useState<string | undefined>(dataLqip);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!lqip) {
      loadLqipManifest().then((manifest) => {
        const foundKey = Object.keys(manifest).find((key) => src.includes(key));
        if (foundKey) {
          setLqip(manifest[foundKey]);
        }
      });
    }
  }, [src, lqip]);

  const hasLqip = !!lqip;

  if (!hasLqip) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={className} 
        loading={loading} 
        // @ts-ignore - fetchPriority is supported in modern types or can be ignored if lagging
        fetchPriority={fetchPriority}
        decoding={decoding}
        style={style} 
        referrerPolicy="no-referrer"
        crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
      />
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${className || ''}`} 
      style={style}
    >
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${lqip}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <img 
        src={src} 
        alt={alt} 
        className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={loading} 
        // @ts-ignore - fetchPriority is supported in modern types or can be ignored if lagging
        fetchPriority={fetchPriority}
        decoding={decoding}
        onLoad={() => setIsLoaded(true)}
        referrerPolicy="no-referrer"
        crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
      />
    </div>
  );
};
