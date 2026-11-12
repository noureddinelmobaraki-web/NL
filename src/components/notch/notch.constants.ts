import React from "react";
import {
  Moon,
  Sun,
  Grid2x2,
  Feather,
  Gamepad2,
  Film,
  Tv,
  Joystick,
  Monitor,
  AudioLines,
  Users,
  Home,
  Globe,
  BookOpen,
  Headphones,
  Disc,
  Sparkles,
  Palette,
  Newspaper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SwitcherMode, SwitcherDest } from "./notch.types";

// الأوضاع الأربعة: سِمات لصفحة الهوم (midnight = الهوم الافتراضي، لم يعد زر وضع).
export const MODES: SwitcherMode[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "bit", label: "Bit", icon: Grid2x2 },
  { id: "lite", label: "Lite", icon: Feather },
];

export type PageKey =
  | "home"
  | "games"
  | "cinema"
  | "anime"
  | "cartoon"
  | "art"
  | "tv"
  | "retro"
  | "xp"
  | "music"
  | "accounts"
  | "liquidGlass"
  | "books"
  | "magazines"
  | "audiobooks"
  | "albums"
  | "x";

// لكل صفحة أيقونة + لون مميّز → يتغير شكل الأورب المنكمش في كل صفحة.
export const PAGE_META: Record<PageKey, { icon: LucideIcon; accent: string }> = {
  home: { icon: Home, accent: "#7fd0ff" },
  games: { icon: Gamepad2, accent: "#8affc1" },
  cinema: { icon: Film, accent: "#ff9fc0" },
  anime: { icon: Sparkles, accent: "#f87171" },
  cartoon: { icon: Tv, accent: "#fbbf24" },
  art: { icon: Palette, accent: "#38bdf8" },
  tv: { icon: Tv, accent: "#9ec9ff" },
  retro: { icon: Joystick, accent: "#ffd27f" },
  xp: { icon: Monitor, accent: "#7fd0ff" },
  music: { icon: AudioLines, accent: "#c9a8ff" },
  accounts: { icon: Users, accent: "#8fe3ff" },
  liquidGlass: { icon: Globe, accent: "#7fd0ff" },
  books: { icon: BookOpen, accent: "#34d399" },
  magazines: { icon: Newspaper, accent: "#38bdf8" },
  audiobooks: { icon: Headphones, accent: "#c084fc" },
  albums: { icon: Disc, accent: "#fbbf24" },
  x: { icon: Sparkles, accent: "#60a5fa" },
};

export interface BuildNotchDestinationsArgs {
  pageKey: PageKey;
  goHome: () => void;
  goto: (isActive: boolean, openFn: () => void, closeFn: () => void) => () => void;
  isGamesOpen: boolean;
  openGames: () => void;
  closeGames: () => void;
  isMoviesOpen: boolean;
  openMovies: () => void;
  closeMovies: () => void;
  isAnimeOpen?: boolean;
  openAnime?: () => void;
  closeAnime?: () => void;
  isCartoonOpen?: boolean;
  openCartoon?: () => void;
  closeCartoon?: () => void;
  isArtOpen?: boolean;
  openArt?: (tab?: "photos" | "drawings" | "avatars") => void;
  closeArt?: () => void;
  isMagazinesOpen?: boolean;
  openMagazines?: () => void;
  closeMagazines?: () => void;
  isTvOpen: boolean;
  openTv: () => void;
  closeTv: () => void;
  isRetroOpen: boolean;
  openRetro: () => void;
  closeRetro: () => void;
  isXpOpen: boolean;
  openXp: () => void;
  closeXp: () => void;
  isMusicOpen: boolean;
  openMusic: () => void;
  closeMusic: () => void;
  isAccountsOpen: boolean;
  openAccounts: () => void;
  closeAccounts: () => void;
  isLiquidGlassOpen: boolean;
  liquidGlassMode: "orbs" | "video" | "sun" | "books" | "audiobooks";
  openLiquidGlass: (mode?: "orbs" | "video" | "sun" | "books" | "audiobooks") => void;
  closeLiquidGlass: () => void;
}

export function buildNotchDestinations({
  pageKey,
  goHome,
  goto,
  isGamesOpen,
  openGames,
  closeGames,
  isMoviesOpen,
  openMovies,
  closeMovies,
  isAnimeOpen = false,
  openAnime = () => {},
  closeAnime = () => {},
  isCartoonOpen = false,
  openCartoon = () => {},
  closeCartoon = () => {},
  isArtOpen = false,
  openArt = () => {},
  closeArt = () => {},
  isMagazinesOpen = false,
  openMagazines = () => {},
  closeMagazines = () => {},
  isTvOpen,
  openTv,
  closeTv,
  isRetroOpen,
  openRetro,
  closeRetro,
  isXpOpen,
  openXp,
  closeXp,
  isMusicOpen,
  openMusic,
  closeMusic,
  isAccountsOpen,
  openAccounts,
  closeAccounts,
  isLiquidGlassOpen,
  liquidGlassMode,
  openLiquidGlass,
  closeLiquidGlass,
}: BuildNotchDestinationsArgs): SwitcherDest[] {
  const openOrToggleLiquid = (
    targetMode: "orbs" | "video" | "sun" | "books" | "audiobooks",
  ) => {
    const active = isLiquidGlassOpen && liquidGlassMode === targetMode;
    return goto(
      active,
      () => openLiquidGlass(targetMode),
      closeLiquidGlass,
    )();
  };

  return [
    {
      id: "home",
      label: "Home",
      title: "Home",
      icon: React.createElement(Home, { size: 16 }),
      isActive: pageKey === "home",
      onClick: goHome,
    },
    {
      id: "games",
      label: "Games",
      title: "Games",
      icon: React.createElement(Gamepad2, { size: 16 }),
      isActive: isGamesOpen,
      onClick: goto(isGamesOpen, openGames, closeGames),
    },
    {
      id: "cinema",
      label: "Cinema",
      title: "Cinema & Movies",
      icon: React.createElement(Film, { size: 16 }),
      isActive: isMoviesOpen,
      onClick: goto(isMoviesOpen, openMovies, closeMovies),
    },
    {
      id: "anime",
      label: "Anime",
      title: "Anime Sub & Dub",
      icon: React.createElement(Sparkles, { size: 16 }),
      isActive: isAnimeOpen,
      onClick: goto(isAnimeOpen, openAnime, closeAnime),
    },
    {
      id: "cartoon",
      label: "Cartoon",
      title: "Spacetoon & Cartoon",
      icon: React.createElement(Tv, { size: 16 }),
      isActive: isCartoonOpen,
      onClick: goto(isCartoonOpen, openCartoon, closeCartoon),
    },
    {
      id: "tv",
      label: "TV",
      title: "TV & Live",
      icon: React.createElement(Tv, { size: 16 }),
      isActive: isTvOpen,
      onClick: goto(isTvOpen, openTv, closeTv),
    },
    {
      id: "retro",
      label: "Retro",
      title: "Classic Games",
      icon: React.createElement(Joystick, { size: 16 }),
      isActive: isRetroOpen,
      onClick: goto(isRetroOpen, openRetro, closeRetro),
    },
    {
      id: "xp",
      label: "Windows XP",
      title: "Windows Desktop",
      icon: React.createElement(Monitor, { size: 16 }),
      isActive: isXpOpen,
      onClick: goto(isXpOpen, openXp, closeXp),
    },
    {
      id: "music",
      label: "Music",
      title: "Music Player",
      icon: React.createElement(AudioLines, { size: 16 }),
      isActive: isMusicOpen,
      onClick: goto(isMusicOpen, openMusic, closeMusic),
    },
    {
      id: "accounts",
      label: "Accounts",
      title: "User Directory",
      icon: React.createElement(Users, { size: 16 }),
      isActive: isAccountsOpen,
      onClick: goto(isAccountsOpen, openAccounts, closeAccounts),
    },
    {
      id: "books",
      label: "Books",
      title: "Books Library",
      icon: React.createElement(BookOpen, { size: 16 }),
      isActive: isLiquidGlassOpen && liquidGlassMode === "books",
      onClick: () => openOrToggleLiquid("books"),
    },
    {
      id: "magazines",
      label: "Magazines",
      title: "The Magazine Rack",
      icon: React.createElement(Newspaper, { size: 16 }),
      isActive: isMagazinesOpen,
      onClick: goto(isMagazinesOpen, openMagazines, closeMagazines),
    },
    {
      id: "art",
      label: "Art",
      title: "Art & Museums Hub",
      icon: React.createElement(Palette, { size: 16 }),
      isActive: isArtOpen,
      onClick: goto(isArtOpen, () => openArt("photos"), closeArt),
    },
    {
      id: "audiobooks",
      label: "Audio Books",
      title: "Audio Books",
      icon: React.createElement(Headphones, { size: 16 }),
      isActive: isLiquidGlassOpen && liquidGlassMode === "audiobooks",
      onClick: () => openOrToggleLiquid("audiobooks"),
    },
    {
      id: "albums",
      label: "Albums",
      title: "Albums",
      icon: React.createElement(Disc, { size: 16 }),
      isActive: isLiquidGlassOpen && liquidGlassMode === "sun",
      onClick: () => openOrToggleLiquid("sun"),
    },
    {
      id: "x",
      label: "X",
      title: "X Stage",
      icon: React.createElement(Sparkles, { size: 16 }),
      isActive: isLiquidGlassOpen && liquidGlassMode === "video",
      onClick: () => openOrToggleLiquid("video"),
    },
  ];
}
