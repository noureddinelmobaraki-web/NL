import type { NodeAction } from './graph.config';

/**
 * Intent-only warming. Nothing is imported at launcher startup. A target chunk
 * is requested only after hover/pointer intent on a leaf, reducing perceived
 * navigation latency without increasing the reception critical path.
 */
export function warmLauncherAction(action: NodeAction): void {
  if (action.kind !== 'open') return;

  switch (action.handler) {
    case 'openMusic':
      void import('../../features/music/MusicPage').catch(() => undefined);
      break;
    case 'openMovies':
      void import('../Movies/MoviesPage').catch(() => undefined);
      break;
    case 'openTv':
      void import('../NlTv/NlTvPage').catch(() => undefined);
      break;
    case 'openXp':
      void import('../WindowsXp/WindowsXpPage').catch(() => undefined);
      break;
    case 'openRetro':
      void import('../RetroWorld/RetroWorldPage').catch(() => undefined);
      break;
    case 'openGames':
      void import('../Games/GamesPage').catch(() => undefined);
      break;
    case 'openAccounts':
      void import('../../features/accounts/AccountsPage').catch(() => undefined);
      break;
  }
}
