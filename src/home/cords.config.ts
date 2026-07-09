// src/home/cords.config.ts
// Topology for the Home rope-cords.
//  - profile: custom hanging topology (node -> profile square -> bio window corners)
//  - streaming: node -> music hub, then music hub -> social hub (sub-branch); the
//    inner button fan is drawn by StationLattice itself.
//  - highlights: node hangs each card (Vault + YouTube) by its TWO top corners.
//  - songs: a dynamic zig-zag ladder (node -> first card, then card-to-card
//    corner-to-corner) over the responsive songs grid.
//  - everything else: a generic node -> content cord (placeholder for later phases).
import type { CordLink, CordNode } from './HomeCords';

const STATION_IDS = [
  'profile',
  'streaming',
  'highlights',
  'gallery',
  'songs',
  'contact',
  'drawings',
] as const;

export const CORD_NODES: CordNode[] = STATION_IDS.map((station) => ({ station }));

const PROFILE_LINKS: CordLink[] = [
  {
    id: 'profile-node-image',
    station: 'profile',
    from: { kind: 'node', station: 'profile' },
    to: { kind: 'el', cordId: 'hero-profile', ax: 0.5, ay: 0.02 },
    sag: 0.08,
  },
  {
    id: 'profile-image-bio-left',
    station: 'profile',
    from: { kind: 'el', cordId: 'hero-profile', ax: 0.14, ay: 0.98 },
    to: { kind: 'el', cordId: 'hero-window', ax: 0.06, ay: 0.02 },
    sag: 0.16,
  },
  {
    id: 'profile-image-bio-right',
    station: 'profile',
    from: { kind: 'el', cordId: 'hero-profile', ax: 0.86, ay: 0.98 },
    to: { kind: 'el', cordId: 'hero-window', ax: 0.94, ay: 0.02 },
    sag: 0.16,
  },
];

const STREAMING_LINKS: CordLink[] = [
  {
    id: 'streaming-node-hub',
    station: 'streaming',
    from: { kind: 'node', station: 'streaming' },
    to: { kind: 'el', cordId: 'streaming-hub', ax: 0.5, ay: 0.0 },
    sag: 0.1,
  },
  {
    id: 'streaming-hub-social',
    station: 'streaming',
    from: { kind: 'el', cordId: 'streaming-hub', ax: 0.5, ay: 1.0 },
    to: { kind: 'el', cordId: 'social-hub', ax: 0.5, ay: 0.0 },
    sag: 0.14,
  },
];

// Each highlights card hangs from the section node by its two top corners.
const HIGHLIGHTS_LINKS: CordLink[] = [
  {
    id: 'highlights-vault-left',
    station: 'highlights',
    from: { kind: 'node', station: 'highlights' },
    to: { kind: 'stationEl', station: 'highlights', sel: '#vault-playlist', ax: 0.06, ay: 0.02 },
    sag: 0.16,
  },
  {
    id: 'highlights-vault-right',
    station: 'highlights',
    from: { kind: 'node', station: 'highlights' },
    to: { kind: 'stationEl', station: 'highlights', sel: '#vault-playlist', ax: 0.94, ay: 0.02 },
    sag: 0.16,
  },
  {
    id: 'highlights-youtube-left',
    station: 'highlights',
    from: { kind: 'node', station: 'highlights' },
    to: { kind: 'stationEl', station: 'highlights', sel: '.nl-hl-player', ax: 0.06, ay: 0.02 },
    sag: 0.16,
  },
  {
    id: 'highlights-youtube-right',
    station: 'highlights',
    from: { kind: 'node', station: 'highlights' },
    to: { kind: 'stationEl', station: 'highlights', sel: '.nl-hl-player', ax: 0.94, ay: 0.02 },
    sag: 0.16,
  },
];

// Gallery: the two panels (ME bit + Through the Lens) shrink and hang on
// opposite sides of the central column; each is roped from the section node
// down to its inner-top corner (the edge that faces the spine).
const GALLERY_LINKS: CordLink[] = [
  // The ME bit image window hangs from the section node by its TWO top corners.
  {
    id: 'gallery-mebit-left',
    station: 'gallery',
    from: { kind: 'node', station: 'gallery' },
    to: { kind: 'stationEl', station: 'gallery', sel: '.me-bit-cta', ax: 0.05, ay: 0.03 },
    sag: 0.14,
  },
  {
    id: 'gallery-mebit-right',
    station: 'gallery',
    from: { kind: 'node', station: 'gallery' },
    to: { kind: 'stationEl', station: 'gallery', sel: '.me-bit-cta', ax: 0.95, ay: 0.03 },
    sag: 0.14,
  },
  // The Lens image window hangs from the BOTTOM corners of the ME bit window above it.
  {
    id: 'gallery-lens-left',
    station: 'gallery',
    from: { kind: 'stationEl', station: 'gallery', sel: '.me-bit-cta', ax: 0.05, ay: 0.97 },
    to: { kind: 'stationEl', station: 'gallery', sel: '.nl-lens-cta', ax: 0.05, ay: 0.03 },
    sag: 0.12,
  },
  {
    id: 'gallery-lens-right',
    station: 'gallery',
    from: { kind: 'stationEl', station: 'gallery', sel: '.me-bit-cta', ax: 0.95, ay: 0.97 },
    to: { kind: 'stationEl', station: 'gallery', sel: '.nl-lens-cta', ax: 0.95, ay: 0.03 },
    sag: 0.12,
  },
];

// Songs: dynamic zig-zag ladder across the responsive songs grid.
const SONGS_LINKS: CordLink[] = [
  {
    id: 'songs-ladder',
    kind: 'chain',
    station: 'songs',
    containerSel: '.nl-songs-lite__grid',
    itemSel: '.nl-song-cell',
    sag: 0.12,
  },
];

const CONTACT_LINKS: CordLink[] = [
  {
    id: 'contact-methods',
    kind: 'chain',
    station: 'contact',
    containerSel: '.nl-contact-methods',
    itemSel: '.nl-contact-chip',
    sag: 0.13,
  },
  {
    id: 'contact-msg-left',
    station: 'contact',
    from: { kind: 'stationEl', station: 'contact', sel: '.nl-contact-chip:last-child', ax: 0.12, ay: 0.94 },
    to: { kind: 'stationEl', station: 'contact', sel: '.nl-contact-msgform', ax: 0.1, ay: 0.04 },
    sag: 0.12,
  },
  {
    id: 'contact-msg-right',
    station: 'contact',
    from: { kind: 'stationEl', station: 'contact', sel: '.nl-contact-chip:last-child', ax: 0.88, ay: 0.94 },
    to: { kind: 'stationEl', station: 'contact', sel: '.nl-contact-msgform', ax: 0.9, ay: 0.04 },
    sag: 0.12,
  },
];

const DRAWINGS_LINKS: CordLink[] = [
  {
    id: 'drawings-hang',
    station: 'drawings',
    from: { kind: 'node', station: 'drawings' },
    to: { kind: 'stationEl', station: 'drawings', sel: '.nld-pendulum__pivot', ax: 0.5, ay: 0.5 },
    sag: 0.08,
  },
];

const GENERIC_IDS = STATION_IDS.filter(
  (id) =>
    id !== 'profile' &&
    id !== 'streaming' &&
    id !== 'highlights' &&
    id !== 'gallery' &&
    id !== 'songs' &&
    id !== 'contact' &&
    id !== 'drawings',
);

const DEFAULT_LINKS: CordLink[] = GENERIC_IDS.map(
  (id): CordLink => ({
    id: `${id}-default`,
    station: id,
    from: { kind: 'node', station: id },
    to: { kind: 'stationEl', station: id, sel: '.nl-home-bare', ax: 0.5, ay: 0.01 },
    sag: 0.14,
  }),
);

export const CORD_LINKS: CordLink[] = [
  ...PROFILE_LINKS,
  ...STREAMING_LINKS,
  ...HIGHLIGHTS_LINKS,
  ...GALLERY_LINKS,
  ...SONGS_LINKS,
  ...CONTACT_LINKS,
  ...DRAWINGS_LINKS,
  ...DEFAULT_LINKS,
];
