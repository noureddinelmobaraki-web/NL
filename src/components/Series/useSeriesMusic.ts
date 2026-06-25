import { useSharedBackgroundMusic } from '../../hooks/useSharedBackgroundMusic';

const SERIES_BG_MUSIC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/movies_hls/index.m3u8';

export function useSeriesMusic(seriesActive: boolean) {
  return useSharedBackgroundMusic(seriesActive, {
    key: 'series',
    url: SERIES_BG_MUSIC,
    volume: 0.6,
  });
}
