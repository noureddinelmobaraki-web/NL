import React from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  widths?: number[];
  formats?: string[];
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  style?: React.CSSProperties;
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
  fetchpriority = 'auto',
  decoding = 'async',
  style
}) => {
  // Extract the base path and filename without extension
  const baseMatch = src.match(/^(.*)\.([a-zA-Z0-9]+)$/);
  
  if (!baseMatch || src.startsWith('http')) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={className} 
        loading={loading} 
        // @ts-ignore - fetchpriority is relatively new in TS
        fetchpriority={fetchpriority}
        decoding={decoding}
        style={style} 
        referrerPolicy="no-referrer"
        crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
      />
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      loading={loading} 
      // @ts-ignore - fetchpriority is relatively new in TS
      fetchpriority={fetchpriority}
      decoding={decoding}
      style={style} 
      referrerPolicy="no-referrer"
      crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
    />
  );
};
