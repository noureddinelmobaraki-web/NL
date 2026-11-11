import React, { useState } from 'react';
import { Globe } from 'lucide-react';

export interface CountryFlagGlassIconProps {
  code?: string;
  name?: string;
  size?: number;
  className?: string;
}

export const CountryFlagGlassIcon: React.FC<CountryFlagGlassIconProps> = ({
  code,
  name,
  size = 24,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const normalizedCode = (code || '').trim().toLowerCase();
  const isValidIso2 = /^[a-z]{2}$/.test(normalizedCode);

  const width = Math.round(size * 1.35);
  const height = size;

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-md overflow-hidden shrink-0 select-none ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
        border: '1px solid rgba(255,255,255,0.32)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.45)',
      }}
      title={name || code}
    >
      {isValidIso2 && !failed ? (
        <img
          src={`https://flagcdn.com/${normalizedCode}.svg`}
          alt={name || normalizedCode.toUpperCase()}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <Globe size={Math.max(12, Math.round(size * 0.65))} className="text-sky-300/90" />
      )}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.06) 45%, rgba(0,0,0,0.2) 100%)',
        }}
      />
    </span>
  );
};
