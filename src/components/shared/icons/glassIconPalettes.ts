export type GlassIconTheme =
  | 'action'
  | 'adventure'
  | 'comedy'
  | 'sports'
  | 'zomoroda'
  | 'science'
  | 'history'
  | 'abjad'
  | 'bonbon'
  | 'movies'
  | 'cosmic'
  | 'emerald'
  | 'crimson'
  | 'neutral';

export interface GlassThemePalette {
  bgGradient: string;
  borderGlow: string;
  iconColor: string;
  dropShadow: string;
}

export const GLASS_ICON_PALETTES: Record<GlassIconTheme, GlassThemePalette> = {
  action: {
    bgGradient: 'linear-gradient(145deg, rgba(239,68,68,0.32), rgba(249,115,22,0.14))',
    borderGlow: 'rgba(248,113,113,0.48)',
    iconColor: '#fca5a5',
    dropShadow: '0 0 12px rgba(239,68,68,0.55)',
  },
  adventure: {
    bgGradient: 'linear-gradient(145deg, rgba(16,185,129,0.32), rgba(20,184,166,0.14))',
    borderGlow: 'rgba(52,211,153,0.48)',
    iconColor: '#6ee7b7',
    dropShadow: '0 0 12px rgba(16,185,129,0.55)',
  },
  comedy: {
    bgGradient: 'linear-gradient(145deg, rgba(245,158,11,0.34), rgba(234,179,8,0.15))',
    borderGlow: 'rgba(251,191,36,0.5)',
    iconColor: '#fde68a',
    dropShadow: '0 0 12px rgba(245,158,11,0.55)',
  },
  sports: {
    bgGradient: 'linear-gradient(145deg, rgba(59,130,246,0.34), rgba(6,182,212,0.15))',
    borderGlow: 'rgba(96,165,250,0.5)',
    iconColor: '#93c5fd',
    dropShadow: '0 0 12px rgba(59,130,246,0.55)',
  },
  zomoroda: {
    bgGradient: 'linear-gradient(145deg, rgba(236,72,153,0.34), rgba(244,63,94,0.15))',
    borderGlow: 'rgba(244,114,182,0.5)',
    iconColor: '#f9a8d4',
    dropShadow: '0 0 12px rgba(236,72,153,0.55)',
  },
  science: {
    bgGradient: 'linear-gradient(145deg, rgba(6,182,212,0.34), rgba(14,165,233,0.15))',
    borderGlow: 'rgba(34,211,238,0.5)',
    iconColor: '#67e8f9',
    dropShadow: '0 0 12px rgba(6,182,212,0.55)',
  },
  history: {
    bgGradient: 'linear-gradient(145deg, rgba(217,119,6,0.34), rgba(180,83,9,0.15))',
    borderGlow: 'rgba(245,158,11,0.48)',
    iconColor: '#fcd34d',
    dropShadow: '0 0 12px rgba(217,119,6,0.5)',
  },
  abjad: {
    bgGradient: 'linear-gradient(145deg, rgba(139,92,246,0.34), rgba(99,102,241,0.15))',
    borderGlow: 'rgba(167,139,250,0.5)',
    iconColor: '#c4b5fd',
    dropShadow: '0 0 12px rgba(139,92,246,0.55)',
  },
  bonbon: {
    bgGradient: 'linear-gradient(145deg, rgba(168,85,247,0.34), rgba(217,70,239,0.15))',
    borderGlow: 'rgba(216,180,254,0.5)',
    iconColor: '#e9d5ff',
    dropShadow: '0 0 12px rgba(168,85,247,0.55)',
  },
  movies: {
    bgGradient: 'linear-gradient(145deg, rgba(99,102,241,0.34), rgba(59,130,246,0.15))',
    borderGlow: 'rgba(129,140,248,0.5)',
    iconColor: '#a5b4fc',
    dropShadow: '0 0 12px rgba(99,102,241,0.55)',
  },
  cosmic: {
    bgGradient: 'linear-gradient(145deg, rgba(56,189,248,0.28), rgba(129,140,248,0.14))',
    borderGlow: 'rgba(125,211,252,0.45)',
    iconColor: '#bae6fd',
    dropShadow: '0 0 12px rgba(56,189,248,0.5)',
  },
  emerald: {
    bgGradient: 'linear-gradient(145deg, rgba(52,211,153,0.28), rgba(16,185,129,0.12))',
    borderGlow: 'rgba(110,231,183,0.45)',
    iconColor: '#a7f3d0',
    dropShadow: '0 0 12px rgba(52,211,153,0.5)',
  },
  crimson: {
    bgGradient: 'linear-gradient(145deg, rgba(244,63,94,0.32), rgba(225,29,72,0.14))',
    borderGlow: 'rgba(251,113,133,0.48)',
    iconColor: '#fda4af',
    dropShadow: '0 0 12px rgba(244,63,94,0.55)',
  },
  neutral: {
    bgGradient: 'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))',
    borderGlow: 'rgba(255,255,255,0.28)',
    iconColor: '#f8fafc',
    dropShadow: '0 0 8px rgba(255,255,255,0.35)',
  },
};
