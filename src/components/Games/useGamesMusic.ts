import { useSharedBackgroundMusic } from '../../hooks/useSharedBackgroundMusic';
import { GAMES_BG_MUSIC } from '../../constants/assets';

export function useGamesMusic(gameActive: boolean) {
  useSharedBackgroundMusic(gameActive, {
    key: 'games',
    url: GAMES_BG_MUSIC,
    volume: 0.6,
  });
}
