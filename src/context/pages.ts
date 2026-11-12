import React from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import type { PageId } from './navigationController';

export type LoaderType = 'games' | 'tv' | 'cinema' | 'retro';

export interface PageDescriptor {
  id: Exclude<PageId, 'home'>;
  key: string;
  sectionName: string;
  loaderType: LoaderType;
  wrapperClassName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

export const GamesPage = lazyWithRetry(
  () => import('../components/Games/GamesPage').then((m) => ({ default: m.GamesPage })),
  'GamesPage',
);
export const MoviesPage = lazyWithRetry(
  () => import('../components/Movies/MoviesPage').then((m) => ({ default: m.MoviesPage })),
  'MoviesPage',
);
export const NlTvPage = lazyWithRetry(
  () => import('../components/NlTv/NlTvPage').then((m) => ({ default: m.default })),
  'NlTvPage',
);
export const RetroWorldPage = lazyWithRetry(
  () =>
    import('../components/RetroWorld/RetroWorldPage').then((m) => ({
      default: m.RetroWorldPage,
    })),
  'RetroWorldPage',
);
export const WindowsXpPage = lazyWithRetry(
  () =>
    import('../components/WindowsXp/WindowsXpPage').then((m) => ({
      default: m.WindowsXpPage,
    })),
  'WindowsXpPage',
);
export const MusicPage = lazyWithRetry(
  () => import('../features/music/MusicPage').then((m) => ({ default: m.default })),
  'MusicPage',
);
export const AccountsPage = lazyWithRetry(
  () => import('../features/accounts/AccountsPage').then((m) => ({ default: m.default })),
  'AccountsPage',
);
export const PortraitPage = lazyWithRetry(
  () => import('../features/portrait/PortraitPage'),
  'portrait',
);
export const LiquidGlassPortalPage = lazyWithRetry(
  () => import('../features/liquid-glass/LiquidGlassPortalPage'),
  'LiquidGlassPortalPage',
);
export const AnimePage = lazyWithRetry(
  () => import('../features/anime/AnimePage').then((m) => ({ default: m.AnimePage })),
  'AnimePage',
);
export const CartoonPage = lazyWithRetry(
  () => import('../features/cartoon/CartoonPage').then((m) => ({ default: m.CartoonPage })),
  'CartoonPage',
);
export const ArtHubPage = lazyWithRetry(
  () => import('../features/art/ArtHubPage').then((m) => ({ default: m.ArtHubPage })),
  'ArtHubPage',
);
export const MagazinesPage = lazyWithRetry(
  () => import('../features/magazines/MagazinesPage').then((m) => ({ default: m.MagazinesPage })),
  'MagazinesPage',
);

export const PAGES: Record<Exclude<PageId, 'home'>, PageDescriptor> = {
  games: {
    id: 'games',
    key: 'games-screen',
    sectionName: 'games',
    loaderType: 'games',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500] pointer-events-none',
    component: GamesPage,
  },
  tv: {
    id: 'tv',
    key: 'tv-screen',
    sectionName: 'tv',
    loaderType: 'tv',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: NlTvPage,
  },
  cinema: {
    id: 'cinema',
    key: 'cinema-screen',
    sectionName: 'cinema',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500] pointer-events-none',
    component: MoviesPage,
  },
  anime: {
    id: 'anime',
    key: 'anime-screen',
    sectionName: 'anime',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: AnimePage,
  },
  cartoon: {
    id: 'cartoon',
    key: 'cartoon-screen',
    sectionName: 'cartoon',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: CartoonPage,
  },
  art: {
    id: 'art',
    key: 'art-screen',
    sectionName: 'art',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: ArtHubPage,
  },
  magazines: {
    id: 'magazines',
    key: 'magazines-screen',
    sectionName: 'magazines',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: MagazinesPage,
  },
  retro: {
    id: 'retro',
    key: 'retro-screen',
    sectionName: 'retro',
    loaderType: 'retro',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: RetroWorldPage,
  },
  xp: {
    id: 'xp',
    key: 'xp-screen',
    sectionName: 'xp',
    loaderType: 'retro',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: WindowsXpPage,
  },
  music: {
    id: 'music',
    key: 'music-screen',
    sectionName: 'music',
    loaderType: 'retro',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: MusicPage,
  },
  accounts: {
    id: 'accounts',
    key: 'accounts-screen',
    sectionName: 'accounts',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: AccountsPage,
  },
  portrait: {
    id: 'portrait',
    key: 'portrait',
    sectionName: 'portrait',
    loaderType: 'retro',
    wrapperClassName: 'fixed inset-0 z-50',
    component: PortraitPage,
  },
  liquidGlass: {
    id: 'liquidGlass',
    key: 'liquid-glass-screen',
    sectionName: 'liquidGlass',
    loaderType: 'cinema',
    wrapperClassName: 'fixed inset-0 w-full h-full z-[8500]',
    component: LiquidGlassPortalPage,
  },
};
