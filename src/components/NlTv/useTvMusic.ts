import { useSharedBackgroundMusic } from '../../hooks/useSharedBackgroundMusic';
import { TV_BG_MUSIC } from '../../constants/assets';

/** channelPlaying = true عند تشغيل قناة تلفاز فعلية → نوقف موسيقى الخلفية */
export function useTvMusic(channelPlaying: boolean) {
  useSharedBackgroundMusic(channelPlaying, {
    key: 'tv',
    url: TV_BG_MUSIC,
    volume: 0.5,
  });
}
