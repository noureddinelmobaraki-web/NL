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
  | "tv"
  | "retro"
  | "xp"
  | "music"
  | "accounts"
  | "liquidGlass";

// لكل صفحة أيقونة + لون مميّز → يتغير شكل الأورب المنكمش في كل صفحة.
export const PAGE_META: Record<PageKey, { icon: LucideIcon; accent: string }> = {
  home: { icon: Home, accent: "#7fd0ff" },
  games: { icon: Gamepad2, accent: "#8affc1" },
  cinema: { icon: Film, accent: "#ff9fc0" },
  tv: { icon: Tv, accent: "#9ec9ff" },
  retro: { icon: Joystick, accent: "#ffd27f" },
  xp: { icon: Monitor, accent: "#7fd0ff" },
  music: { icon: AudioLines, accent: "#c9a8ff" },
  accounts: { icon: Users, accent: "#8fe3ff" },
  liquidGlass: { icon: Globe, accent: "#7fd0ff" },
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
}: BuildNotchDestinationsArgs): SwitcherDest[] {
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
  ];
}
