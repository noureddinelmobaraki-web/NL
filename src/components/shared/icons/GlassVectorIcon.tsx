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

export const MoroccoFlagSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    width={size}
    height={Math.round(size * 0.72)}
    viewBox="0 0 28 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 rounded-[3px] shadow-sm ${className}`}
    aria-hidden="true"
  >
    <rect width="28" height="20" rx="3" fill="#C1272D" />
    <path
      d="M14 5.2L15.12 8.65H18.75L15.81 10.78L16.93 14.23L14 12.1L11.07 14.23L12.19 10.78L9.25 8.65H12.88L14 5.2Z"
      stroke="#006233"
      strokeWidth="1.35"
      strokeLinejoin="round"
    />
  </svg>
);

