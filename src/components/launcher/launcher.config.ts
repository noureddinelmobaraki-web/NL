// src/components/launcher/launcher.config.ts
// Data-driven config for the launcher.

export const LAUNCHER_ENABLED = true;

export type LauncherAction =
  | { kind: 'open'; handler: 'openMusic' | 'openMovies' | 'openTv' | 'openXp' | 'openRetro' | 'openGames' | 'openAccounts' }
  | { kind: 'auth' }                       // openAuthModal
  | { kind: 'me'; theme?: 'light' | 'dark' | 'midnight' | 'bit' | 'lite' };

export type LeafItem = { id: string; label: string; icon: string; action: LauncherAction };
export type Branch = { id: string; label: string; icon: string; items: LeafItem[] };
export type Category =
  | { id: 'me'; kind: 'me'; label: 'Me!!'; tagline: 'Get to know me'; icon: string }
  | { id: 'ent'; kind: 'two-level'; label: 'Entertainment'; tagline: 'Watch & Listen'; branches: Branch[] }
  | { id: 'nos'; kind: 'single'; label: 'Nostalgia'; tagline: 'The old web, remembered'; items: LeafItem[] };

export const LAUNCHER: Category[] = [
  { 
    id: 'me', 
    kind: 'me', 
    label: 'Me!!', 
    tagline: 'Get to know me', 
    icon: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/ME_520x520.webp' 
  },
  { 
    id: 'ent', 
    kind: 'two-level', 
    label: 'Entertainment', 
    tagline: 'Watch & Listen', 
    branches: [
      { 
        id: 'listen', 
        label: 'Listen', 
        icon: 'headphones', 
        items: [
          { id: 'music', label: 'NL Music', icon: 'music', action: { kind: 'open', handler: 'openMusic' } },
        ] 
      },
      { 
        id: 'watch', 
        label: 'Watch', 
        icon: 'play', 
        items: [
          { id: 'movies', label: 'Movies & Series', icon: 'film', action: { kind: 'open', handler: 'openMovies' } },
          { id: 'tv', label: 'NL TV', icon: 'tv', action: { kind: 'open', handler: 'openTv' } },
        ] 
      },
    ] 
  },
  { 
    id: 'nos', 
    kind: 'single', 
    label: 'Nostalgia', 
    tagline: 'The old web, remembered', 
    items: [
      { id: 'xp', label: 'Windows XP', icon: 'monitor', action: { kind: 'open', handler: 'openXp' } },
      { id: 'retro', label: 'Retro', icon: 'joystick', action: { kind: 'open', handler: 'openRetro' } },
      { id: 'games', label: 'Games', icon: 'gamepad-2', action: { kind: 'open', handler: 'openGames' } },
    ] 
  },
];

export const MODES: { id: 'light' | 'dark' | 'bit' | 'lite'; label: string; color: string }[] = [
  { id: 'light', label: 'Light', color: '#f3f4f6' },
  { id: 'dark', label: 'Dark', color: '#1f2937' },
  { id: 'bit', label: 'Bit', color: '#f59e0b' },
  { id: 'lite', label: 'Lite', color: '#10b981' },
];
