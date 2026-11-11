import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { GlassVectorIcon } from './GlassVectorIcon';
import type { GlassIconTheme } from './glassIconPalettes';

export interface SolarDuotoneIconProps {
  solarName: string;
  fallbackIcon: LucideIcon;
  theme?: GlassIconTheme;
  size?: number;
  active?: boolean;
  className?: string;
}

export const SolarDuotoneIcon: React.FC<SolarDuotoneIconProps> = ({
  solarName,
  fallbackIcon,
  theme = 'cosmic',
  size = 18,
  active = false,
  className = '',
}) => {
  const [svgFailed, setSvgFailed] = useState(false);

  if (svgFailed || !solarName) {
    return (
      <GlassVectorIcon
        icon={fallbackIcon}
        theme={theme}
        size={size}
        active={active}
        className={className}
      />
    );
  }

  const boxSize = Math.round(size * 1.85);

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-xl shrink-0 select-none overflow-hidden transition-transform duration-300 ${
        active ? 'scale-105' : ''
      } ${className}`}
      style={{
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <img
        src={`https://api.iconify.design/solar/${solarName}.svg?color=%23ffffff`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setSvgFailed(true)}
        className="relative z-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"
      />
    </span>
  );
};
