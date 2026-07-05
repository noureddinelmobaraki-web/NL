import type { Theme } from '../../../utils/userPrefs';

// accent زجاجي هادئ لكل وضع (لا ذهبي).
const ACCENT: Record<string, string> = {
  dark:     '#6cc6ff',
  light:    '#2b8fe0',
  midnight: '#b39cff',
  bit:      '#7cf2c4',
  lite:     '#7fd0ff',
  retro:    '#9fe0ff',
};

export function useThemeSkin(theme: Theme) {
  const accent = ACCENT[theme] ?? ACCENT.dark;
  const lightPanel = theme === 'light' || theme === 'lite' || theme === 'bit';
  return { accent, lightPanel };
}
