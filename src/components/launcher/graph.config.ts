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
  | "openSharat"
  | "openNoir"
  | "openCommercials"
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
  /** Full URL (desktop glass icon) OR 'lucide:<name>' fallback. */
  icon: string;
  /** Optional lightweight mobile WebP icon (64x64) used on viewports <= 767px. */
  iconMobile?: string;
  /** Optional lightweight muted MP4 video used as the capsule's ambient glass background. */
  bgVideo?: string;
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
        icon: `${CDN}/desktop/home.webp`,
        iconMobile: `${CDN}/mobile/home.webp`,
        bgVideo: `${CDN}/video/home.mp4`,
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
        icon: `${CDN}/desktop/listen.webp`,
        iconMobile: `${CDN}/mobile/listen.webp`,
        bgVideo: `${CDN}/video/listen.mp4`,
        action: { kind: "branch" },
        children: [
          {
            id: "music",
            label: "NL Music",
            icon: `${CDN}/desktop/nl-music.webp`,
            iconMobile: `${CDN}/mobile/nl-music.webp`,
            bgVideo: `${CDN}/video/nl-music.mp4`,
            action: { kind: "open", handler: "openMusic" },
          },
          {
            id: "og-albums",
            label: "OG ALBUMS",
            icon: `${CDN}/desktop/og-albums.webp`,
            iconMobile: `${CDN}/mobile/og-albums.webp`,
            bgVideo: `${CDN}/video/og-albums.mp4`,
            action: { kind: "open", handler: "openLiquidAlbums" },
          },
          {
            id: "audiobooks",
            label: "Audio Books",
            icon: `${CDN}/desktop/audiobooks.webp`,
            iconMobile: `${CDN}/mobile/audiobooks.webp`,
            bgVideo: `${CDN}/video/audiobooks.mp4`,
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
            icon: `${CDN}/desktop/books.webp`,
            iconMobile: `${CDN}/mobile/books.webp`,
            bgVideo: `${CDN}/video/books.mp4`,
            action: { kind: "open", handler: "openLiquidBooks" },
          },
          {
            id: "magazines",
            label: "Magazines",
            icon: `${CDN}/desktop/magazines.webp`,
            iconMobile: `${CDN}/mobile/magazines.webp`,
            bgVideo: `${CDN}/video/magazines.mp4`,
            action: { kind: "open", handler: "openMagazines" },
          },
          {
            id: "audiobooks",
            label: "Audio Books",
            icon: `${CDN}/desktop/audiobooks.webp`,
            iconMobile: `${CDN}/mobile/audiobooks.webp`,
            bgVideo: `${CDN}/video/audiobooks.mp4`,
            action: { kind: "open", handler: "openLiquidAudiobooks" },
          },
          {
            id: "art",
            label: "Photos & Museums",
            icon: `${CDN}/desktop/photos-museums.webp`,
            iconMobile: `${CDN}/mobile/photos-museums.webp`,
            bgVideo: `${CDN}/video/photos-museums.mp4`,
            action: { kind: "open", handler: "openArtPhotos" },
          },
        ],
      },
      {
        id: "watch",
        label: "Watch",
        icon: `${CDN}/desktop/watch.webp`,
        iconMobile: `${CDN}/mobile/watch.webp`,
        bgVideo: `${CDN}/video/watch.mp4`,
        action: { kind: "branch" },
        children: [
          {
            id: "movies",
            label: "Movies & Series",
            icon: `${CDN}/desktop/movies-series.webp`,
            iconMobile: `${CDN}/mobile/movies-series.webp`,
            bgVideo: `${CDN}/video/movies-series.mp4`,
            action: { kind: "open", handler: "openMovies" },
          },
          {
            id: "anime",
            label: "Anime",
            icon: `${CDN}/desktop/anime.webp`,
            iconMobile: `${CDN}/mobile/anime.webp`,
            bgVideo: `${CDN}/video/anime.mp4`,
            action: { kind: "open", handler: "openAnime" },
          },
          {
            id: "cartoon",
            label: "Cartoon",
            icon: `${CDN}/desktop/cartoon.webp`,
            iconMobile: `${CDN}/mobile/cartoon.webp`,
            bgVideo: `${CDN}/video/cartoon.mp4`,
            action: { kind: "open", handler: "openCartoon" },
          },
          {
            id: "sharat",
            label: "Sharat",
            icon: "lucide:disc-3",
            action: { kind: "open", handler: "openSharat" },
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
      {
        id: "noir",
        label: "Classic Noir & B&W",
        icon: "lucide:film",
        action: { kind: "open", handler: "openNoir" },
      },
      {
        id: "commercials",
        label: "Vintage Ads & TV",
        icon: "lucide:tv",
        action: { kind: "open", handler: "openCommercials" },
      },
    ],
  },
];
