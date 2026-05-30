import React, { useState, useEffect } from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
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

  const base = import.meta.env.BASE_URL || '/';
  manifestPromise = fetch(`${base.endsWith('/') ? base : base + '/'}data/lqip-manifest.json`)
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
  width,
  height,
  className,
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  style,
  dataLqip
}) => {
  const [lqip, setLqip] = useState<string | undefined>(dataLqip);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Skip LQIP for eager/high-priority images (LCP candidates like profile photo)
  const isLcpImage = loading === 'eager' || fetchPriority === 'high';

  useEffect(() => {
    if (!lqip && !isLcpImage) {
      loadLqipManifest().then((manifest) => {
        const foundKey = Object.keys(manifest).find((key) => src.includes(key));
        if (foundKey) {
          setLqip(manifest[foundKey]);
        }
      });
    }
  }, [src, lqip, isLcpImage]);

  const hasLqip = !!lqip;

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900/10 border border-dashed border-zinc-500/20 rounded-lg ${className}`} style={{ ...style, minHeight: height || 100 }}>
        <div className="flex flex-col items-center gap-1 opacity-40">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-mono">IMG_FAIL</span>
        </div>
      </div>
    );
  }

  if (!hasLqip || isLcpImage) {
    return (
      <img 
        src={src} 
        alt={alt} 
        width={width}
        height={height}
        className={className} 
        loading={loading} 
        // @ts-ignore - fetchPriority is supported in modern types or can be ignored if lagging
        fetchPriority={fetchPriority}
        decoding={decoding}
        style={style} 
        onError={() => setHasError(true)}
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
        width={width}
        height={height}
        className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={loading} 
        // @ts-ignore - fetchPriority is supported in modern types or can be ignored if lagging
        fetchPriority={fetchPriority}
        decoding={decoding}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
        crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
      />
    </div>
  );
};
