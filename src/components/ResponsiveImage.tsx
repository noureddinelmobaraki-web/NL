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
  onContextMenu?: React.MouseEventHandler<HTMLImageElement>;
  draggable?: boolean;
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
 * Normalize image URLs for GitHub Pages deployments with a base path (e.g. /NL/).
 * - If src is an absolute path like "/images/x.webp", convert to "{BASE_URL}images/x.webp"
 * - Keep fully-qualified URLs (http/https) as-is
 * - Keep relative paths as-is
 */
function resolveImageSrc(src: string): string {
  const base = import.meta.env.BASE_URL || '/';

  // External URLs
  if (/^https?:\/\//i.test(src)) return src;

  // Absolute path should respect BASE_URL (GitHub Pages subpath)
  if (src.startsWith('/')) {
    const normalizedBase = base.endsWith('/') ? base : base + '/';
    return normalizedBase + src.slice(1);
  }

  return src;
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
  loading,
  fetchPriority,
  decoding,
  style,
  dataLqip,
  onContextMenu,
  draggable,
}) => {
  const resolvedLoading = loading || 'lazy';
  const resolvedDecoding = decoding || 'async';
  const resolvedFetchPriority =
    resolvedLoading === 'eager' ? 'high' : (fetchPriority || 'auto');

  const [lqip, setLqip] = useState<string | undefined>(dataLqip);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Skip LQIP for eager/high-priority images (LCP candidates like profile photo)
  const isLcpImage = resolvedLoading === 'eager' || resolvedFetchPriority === 'high';

  const finalSrc = resolveImageSrc(src);

  useEffect(() => {
    if (!lqip && !isLcpImage) {
      loadLqipManifest().then((manifest) => {
        const foundKey = Object.keys(manifest).find((key) => finalSrc.includes(key));
        if (foundKey) {
          setLqip(manifest[foundKey]);
        }
      });
    }
  }, [finalSrc, lqip, isLcpImage]);

  const hasLqip = !!lqip;

  // إيلا فشلت الصورة: تجاهلها كليًا (ما نعرضو والو) — نعرضو فقط الصور الموجودة.
  if (hasError) return null;

  const imgProps = {
    src: finalSrc,
    alt,
    width,
    height,
    loading: resolvedLoading,
    // @ts-ignore
    fetchPriority: resolvedFetchPriority,
    decoding: resolvedDecoding,
    onError: () => setHasError(true),
    referrerPolicy: 'no-referrer' as const,
    crossOrigin: finalSrc.startsWith('http') ? 'anonymous' as const : undefined,
    onContextMenu,
    draggable,
  };

  const renderSources = () => {
    if (finalSrc.endsWith('.webp')) {
      const avifSrc = finalSrc.replace(/\.webp$/, '.avif');
      return (
        <>
          <source type="image/avif" srcSet={avifSrc} />
          <source type="image/webp" srcSet={finalSrc} />
        </>
      );
    }
    return null;
  };

  if (!hasLqip || isLcpImage) {
    return (
      <picture>
        {renderSources()}
        <img {...imgProps} className={className} style={style} />
      </picture>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={style}>
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
      <picture>
        {renderSources()}
        <img
          {...imgProps}
          className={`${className || ''} ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-300`}
          onLoad={() => setIsLoaded(true)}
        />
      </picture>
    </div>
  );
};
