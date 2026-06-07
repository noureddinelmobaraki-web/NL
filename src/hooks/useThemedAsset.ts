import { useMemo } from 'react';
import { useResolvedTheme } from './useResolvedTheme';
import { getThemedImage, THEME_BG_MUSIC, ASSETS } from '../constants/assets';

export function useThemedAsset() {
  const theme = useResolvedTheme();
  return useMemo(() => ({
    theme,
    profile: getThemedImage('profile', theme),
    heroBg: getThemedImage('heroBg', theme),
    bgMusic: THEME_BG_MUSIC[theme] ?? ASSETS.media.music,
    lensMusic: ASSETS.media.lensMusic,
    meBitMusic: ASSETS.media.meBitMusic,
    isLight: theme === 'light',
    isDark: theme === 'dark' || theme === 'midnight',
    isPixel: theme === 'bit',
    isLite: theme === 'lite',
  }), [theme]);
}
