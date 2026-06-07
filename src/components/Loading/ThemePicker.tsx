import type { Theme } from '../../utils/userPrefs';

import midnightIcon from './assets/midnight_icon.png';
import midnightBg from './assets/midnight_BG.png';
import darkIcon from './assets/dark_icon.gif';
import darkBg from './assets/dark_BG.png';
import lightIcon from './assets/light_icon.gif';
import lightBg from './assets/light_BG.gif';
import bitIcon from './assets/bit_icon.gif';
import bitBg from './assets/bit_BG.gif';
import liteIcon from './assets/lite_icon.gif';
import liteBg from './assets/lite_BG.png';
import retroIcon from './assets/retro_icon.gif';
import retroBg from './assets/retro_BG.png';

interface Props {
  onPick: (theme: Theme) => void;
}

const THEMES: Array<{ id: Theme; label: string; icon: string; bg: string; fg: string; textShadow?: string }> = [
  { id: 'midnight', label: 'Midnight', icon: midnightIcon, bg: `url("${midnightBg}") center/cover`, fg: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  { id: 'dark',     label: 'Dark',     icon: darkIcon,     bg: `url("${darkBg}") center/cover`,     fg: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  { id: 'light',    label: 'Light',    icon: lightIcon,    bg: `url("${lightBg}") center/cover`,    fg: '#222', textShadow: '0 2px 4px rgba(255,255,255,0.8)' },
  { id: 'bit',      label: '8-Bit',    icon: bitIcon,      bg: `url("${bitBg}") center/cover`,      fg: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  { id: 'lite',     label: 'Lite',     icon: liteIcon,     bg: `url("${liteBg}") center/cover`,     fg: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  { id: 'retro',    label: 'Retro',    icon: retroIcon,    bg: `url("${retroBg}") center/cover`,    fg: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
];

export const ThemePicker = ({ onPick }: Props) => (
  <div
    role="group"
    aria-label="Choose visual theme to enter the site"
    style={{
      position: 'relative', zIndex: 5,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 'clamp(8px, 1.8vw, 16px)',
      padding: 'clamp(12px, 2.5vw, 22px)',
      background: 'rgba(8,12,32,0.55)',
      backdropFilter: 'blur(14px) saturate(160%)',
      WebkitBackdropFilter: 'blur(14px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 14,
      maxWidth: 'min(520px, 92vw)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
      animation: 'nl-fade-up 0.9s 0.4s ease-out both',
    }}
  >
    {THEMES.map(t => (
      <button
        key={t.id}
        type="button"
        onClick={() => onPick(t.id)}
        aria-label={`Enter site in ${t.label} theme`}
        style={{
          background: t.bg,
          color: t.fg,
          textShadow: t.textShadow,
          border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: 10,
          padding: 'clamp(10px, 2vw, 14px) clamp(6px, 1.5vw, 12px)',
          cursor: 'pointer',
          fontSize: 'clamp(0.72rem, 1.6vw, 0.88rem)',
          fontFamily: 'var(--font-manga,"Impact",sans-serif)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          transition: 'transform 180ms ease, box-shadow 180ms ease, filter 180ms ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
          e.currentTarget.style.filter = 'brightness(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.filter = '';
        }}
      >
        <img src={t.icon} alt={`${t.label} icon`} style={{ width: '2.5em', height: '2.5em', objectFit: 'contain' }} aria-hidden="true" />
        <span>{t.label}</span>
      </button>
    ))}
  </div>
);
