import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { GLASS_ICON_PALETTES, type GlassIconTheme } from './glassIconPalettes';

export interface GlassVectorIconProps {
  icon: LucideIcon;
  theme?: GlassIconTheme;
  size?: number;
  active?: boolean;
  badge?: boolean;
  className?: string;
}

export const GlassVectorIcon: React.FC<GlassVectorIconProps> = ({
  icon: Icon,
  theme = 'cosmic',
  size = 18,
  active = false,
  badge = true,
  className = '',
}) => {
  const palette = GLASS_ICON_PALETTES[theme] || GLASS_ICON_PALETTES.cosmic;

  if (!badge) {
    return (
      <Icon
        size={size}
        strokeWidth={active ? 2.4 : 2}
        className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''} ${className}`}
        style={{
          color: palette.iconColor,
          filter: active ? `drop-shadow(${palette.dropShadow})` : undefined,
        }}
      />
    );
  }

  const boxSize = Math.round(size * 1.85);

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-xl shrink-0 select-none overflow-hidden transition-all duration-300 ${
        active ? 'scale-105' : ''
      } ${className}`}
      style={{
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        background: palette.bgGradient,
        border: `1px solid ${palette.borderGlow}`,
        boxShadow: active
          ? `${palette.dropShadow}, inset 0 1px 1px rgba(255,255,255,0.45)`
          : 'inset 0 1px 1px rgba(255,255,255,0.28), 0 4px 10px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      }}
      aria-hidden="true"
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      <Icon
        size={size}
        strokeWidth={2.2}
        className="relative z-10"
        style={{
          color: palette.iconColor,
          filter: `drop-shadow(${palette.dropShadow})`,
        }}
      />
    </span>
  );
};
