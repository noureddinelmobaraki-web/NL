import { useSharedBackgroundMusic } from '../../hooks/useSharedBackgroundMusic';

const MOVIES_BG_MUSIC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/movies_hls/index.m3u8';

export function useMoviesMusic(movieActive: boolean) {
  return useSharedBackgroundMusic(movieActive, {
    key: 'movies',
    url: MOVIES_BG_MUSIC,
    volume: 0.6,
  });
}
