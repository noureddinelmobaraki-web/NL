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
  | "openMusic"
  | "openMovies"
  | "openTv"
  | "openAnime"
  | "openCartoon"
  | "openXp"
  | "openRetro"
  | "openGames"
  | "openAccounts"
  | "openLiquidBooks"
  | "openLiquidAudiobooks"
  | "openLiquidAlbums"
  | "openLiquidX"
  | "openArtPhotos"
  | "openArtDrawings"
  | "openArtAvatars"
  | "openMagazines";

export type NodeAction =
  | { kind: "open"; handler: OpenHandler } // full-screen page (genie transition)
  | { kind: "me" } // enter personal page, default theme (midnight)
  | { kind: "theme"; theme: "light" | "dark" | "bit" | "lite" } // enter personal page with a skin
  | { kind: "branch" }; // expandable only (no direct navigation)

export interface GraphNode {
  id: string;
  label: string;
  /** Full URL (glass icon) OR 'lucide:<name>' fallback. */
  icon: string;
  action: NodeAction;
  /** Only shown on root pills. */
  tagline?: string;
  /** Optional visual tint for the pill (e.g. the default 'midnight' skin). */
  tint?: "midnight";
  children?: GraphNode[];
}

const CDN = "https://noureddinelmobaraki-web.github.io/nl-audio-cdn";

export const ROOTS: GraphNode[] = [
  {
    id: "me",
    label: "Me!!",
    tagline: "Get to know me",
    icon: `${CDN}/ME_520x520.webp`,
    action: { kind: "branch" },
    children: [
      // Home is now the ONLY child of "me": a standalone primary page. The four
      // skins (light/dark/bit/lite) were removed from the reception screen — they
      // live exclusively as "Modes" inside the notch window AFTER entering Home.
      {
        id: "home",
        label: "Home",
        icon: "lucide:home",
        tint: "midnight",
        action: { kind: "me" },
      },
    ],
  },
  {
    id: "ent",
    label: "Entertainment",
    tagline: "Watch, Listen, Read & Play",
    icon: `${CDN}/ico/Entertainment.png`,
    action: { kind: "branch" },
    children: [
      {
        id: "listen",
        label: "Listen",
        icon: `${CDN}/ico/Listen.ico`,
        action: { kind: "branch" },
        children: [
          {
            id: "music",
            label: "NL Music",
            icon: `${CDN}/ico/NL%20music.ico`,
            action: { kind: "open", handler: "openMusic" },
          },
          {
            id: "og-albums",
            label: "OG ALBUMS",
            icon: `${CDN}/ALBUMS.webp`,
            action: { kind: "open", handler: "openLiquidAlbums" },
          },
          {
            id: "audiobooks",
            label: "Audio Books",
            icon: "lucide:headphones",
            action: { kind: "open", handler: "openLiquidAudiobooks" },
          },
        ],
      },
      {
        id: "read",
        label: "Read",
        icon: "lucide:book-open",
        action: { kind: "branch" },
        children: [
          {
            id: "books",
            label: "Books",
            icon: "lucide:book",
            action: { kind: "open", handler: "openLiquidBooks" },
          },
          {
            id: "magazines",
            label: "Magazines",
            icon: "lucide:newspaper",
            action: { kind: "open", handler: "openMagazines" },
          },
          {
            id: "audiobooks",
            label: "Audio Books",
            icon: "lucide:headphones",
            action: { kind: "open", handler: "openLiquidAudiobooks" },
          },
          {
            id: "art",
            label: "Photos & Museums",
            icon: "lucide:palette",
            action: { kind: "open", handler: "openArtPhotos" },
          },
        ],
      },
      {
        id: "watch",
        label: "Watch",
        icon: `${CDN}/ico/Watch.png`,
        action: { kind: "branch" },
        children: [
          {
            id: "movies",
            label: "Movies & Series",
            icon: "lucide:clapperboard",
            action: { kind: "open", handler: "openMovies" },
          },
          {
            id: "anime",
            label: "Anime",
            icon: "lucide:sparkles",
            action: { kind: "open", handler: "openAnime" },
          },
          {
            id: "cartoon",
            label: "Cartoon",
            icon: "lucide:tv",
            action: { kind: "open", handler: "openCartoon" },
          },
          {
            id: "tv",
            label: "NL TV",
            icon: `${CDN}/ico/NL%20TV.ico`,
            action: { kind: "open", handler: "openTv" },
          },
          {
            id: "x-video",
            label: "X",
            icon: `${CDN}/X.webp`,
            action: { kind: "open", handler: "openLiquidX" },
          },
        ],
      },
      {
        id: "play",
        label: "Play",
        icon: "lucide:gamepad-2",
        action: { kind: "branch" },
        children: [
          {
            id: "games",
            label: "Games",
            icon: `${CDN}/ico/Games.png`,
            action: { kind: "open", handler: "openGames" },
          },
        ],
      },
    ],
  },
  {
    id: "nos",
    label: "Nostalgia",
    tagline: "The old web, remembered",
    icon: `${CDN}/ico/Nostalgia.png`,
    action: { kind: "branch" },
    children: [
      {
        id: "xp",
        label: "Windows XP",
        icon: `${CDN}/ico/XP.ico`,
        action: { kind: "open", handler: "openXp" },
      },
      {
        id: "retro",
        label: "Retro",
        icon: `${CDN}/ico/Retro.png`,
        action: { kind: "open", handler: "openRetro" },
      },
    ],
  },
];
