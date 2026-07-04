// src/components/launcher/graph.config.ts
// Data-driven model for the radial branching launcher (glass mind-map).
// Every node renders as a WIDE GLASS PILL (icon chip + label) that hugs its
// text — never a window/box card. Children fan out from their parent on tap,
// connected by curved glass rays.
//
// Icon values:
//   - A full URL  -> rendered as <img> (frutiger-aero CDN glass icons).
//   - 'lucide:xxx' -> rendered as a lucide-react glyph fallback.

export type OpenHandler =
  | 'openMusic'
  | 'openMovies'
  | 'openTv'
  | 'openXp'
  | 'openRetro'
  | 'openGames'
  | 'openAccounts';

export type NodeAction =
  | { kind: 'open'; handler: OpenHandler }              // full-screen page (genie transition)
  | { kind: 'me' }                                      // enter personal page, default theme (midnight)
  | { kind: 'theme'; theme: 'light' | 'dark' | 'bit' | 'lite' } // enter personal page with a skin
  | { kind: 'branch' };                                 // expandable only (no direct navigation)

export interface GraphNode {
  id: string;
  label: string;
  /** Full URL (glass icon) OR 'lucide:<name>' fallback. */
  icon: string;
  action: NodeAction;
  /** Only shown on root pills. */
  tagline?: string;
  /** Optional visual tint for the pill (e.g. the default 'midnight' skin). */
  tint?: 'midnight';
  children?: GraphNode[];
}

const CDN = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn';

export const ROOTS: GraphNode[] = [
  {
    id: 'me',
    label: 'Me!!',
    tagline: 'Get to know me',
    icon: `${CDN}/ME_520x520.webp`,
    action: { kind: 'branch' },
    children: [
      // Midnight is the default entry; the other four are the "special skins".
      { id: 'skin-midnight', label: 'Midnight', icon: 'lucide:moon-star', tint: 'midnight', action: { kind: 'me' } },
      { id: 'skin-light', label: 'Light', icon: 'lucide:sun', action: { kind: 'theme', theme: 'light' } },
      { id: 'skin-dark', label: 'Dark', icon: 'lucide:moon', action: { kind: 'theme', theme: 'dark' } },
      { id: 'skin-bit', label: 'Bit', icon: 'lucide:joystick', action: { kind: 'theme', theme: 'bit' } },
      { id: 'skin-lite', label: 'Lite', icon: 'lucide:feather', action: { kind: 'theme', theme: 'lite' } },
    ],
  },
  {
    id: 'ent',
    label: 'Entertainment',
    tagline: 'Watch & Listen',
    icon: `${CDN}/ico/Entertainment.png`,
    action: { kind: 'branch' },
    children: [
      {
        id: 'listen',
        label: 'Listen',
        icon: `${CDN}/ico/Listen.ico`,
        action: { kind: 'branch' },
        children: [
          { id: 'music', label: 'NL Music', icon: `${CDN}/ico/NL%20music.ico`, action: { kind: 'open', handler: 'openMusic' } },
        ],
      },
      {
        id: 'watch',
        label: 'Watch',
        icon: `${CDN}/ico/Watch.png`,
        action: { kind: 'branch' },
        children: [
          // No dedicated Movies glass icon was provided -> lucide fallback for now.
          { id: 'movies', label: 'Movies & Series', icon: 'lucide:clapperboard', action: { kind: 'open', handler: 'openMovies' } },
          { id: 'tv', label: 'NL TV', icon: `${CDN}/ico/NL%20TV.ico`, action: { kind: 'open', handler: 'openTv' } },
        ],
      },
    ],
  },
  {
    id: 'nos',
    label: 'Nostalgia',
    tagline: 'The old web, remembered',
    icon: `${CDN}/ico/Nostalgia.png`,
    action: { kind: 'branch' },
    children: [
      { id: 'xp', label: 'Windows XP', icon: `${CDN}/ico/XP.ico`, action: { kind: 'open', handler: 'openXp' } },
      { id: 'retro', label: 'Retro', icon: `${CDN}/ico/Retro.png`, action: { kind: 'open', handler: 'openRetro' } },
      { id: 'games', label: 'Games', icon: `${CDN}/ico/Games.png`, action: { kind: 'open', handler: 'openGames' } },
    ],
  },
];
