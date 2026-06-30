import type { JSX } from 'react';
import type { Theme } from '../../utils/userPrefs';

interface Props {
  onPick: (theme: Theme) => void;
}

type ThemeDef = {
  id: Theme;
  label: string;
  bg: string;
  fg: string;
  radius: string;
  icon: JSX.Element;
};

const ICON: Record<Theme, JSX.Element> = {
  midnight: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5Z" />
      <circle cx="17" cy="5.5" r="0.7" fill="currentColor" />
      <circle cx="14" cy="3.6" r="0.5" fill="currentColor" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A8 8 0 1 1 11.2 3 6.2 6.2 0 0 0 21 12.8Z" fill="currentColor" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  ),
  bit: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <rect x="4" y="4" width="4" height="4" /><rect x="10" y="4" width="4" height="4" /><rect x="16" y="4" width="4" height="4" />
      <rect x="4" y="10" width="4" height="4" /><rect x="16" y="10" width="4" height="4" />
      <rect x="4" y="16" width="4" height="4" /><rect x="10" y="16" width="4" height="4" /><rect x="16" y="16" width="4" height="4" />
    </svg>
  ),
  lite: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" />
      <path d="M5 19 13 11" />
    </svg>
  ),
  retro: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M6 16h12" />
    </svg>
  ),
};

const THEMES: ThemeDef[] = [
  { id: 'midnight', label: 'Midnight', bg: 'radial-gradient(circle at 30% 30%, #2a2160, #15103a)', fg: '#cdb4ff', radius: '50% 50% 52% 48% / 55% 50% 50% 45%', icon: ICON.midnight },
  { id: 'dark', label: 'Dark', bg: 'radial-gradient(circle at 30% 30%, #2b2b2b, #0e0e0e)', fg: '#ffffff', radius: '54% 46% 50% 50% / 48% 52% 48% 52%', icon: ICON.dark },
  { id: 'light', label: 'Light', bg: 'radial-gradient(circle at 30% 30%, #ffffff, #ece4d6)', fg: '#2a2a2a', radius: '48% 52% 46% 54% / 52% 46% 54% 48%', icon: ICON.light },
  { id: 'bit', label: '8-Bit', bg: 'radial-gradient(circle at 30% 30%, #29469e, #1d2b53)', fg: '#ffd166', radius: '50% 50% 48% 52% / 50% 54% 46% 50%', icon: ICON.bit },
  { id: 'lite', label: 'Lite', bg: 'radial-gradient(circle at 30% 30%, #3c5a45, #233528)', fg: '#d7ffe0', radius: '52% 48% 54% 46% / 46% 50% 50% 54%', icon: ICON.lite },
  { id: 'retro', label: 'Retro', bg: 'radial-gradient(circle at 30% 30%, #dfb56c, #8c6018)', fg: '#121212', radius: '45% 55% 48% 52% / 52% 48% 52% 48%', icon: ICON.retro },
];

export const ThemePicker = ({ onPick }: Props) => (
  <div
    role="group"
    aria-label="Choose visual theme to enter the site"
    style={{
      position: 'relative',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '4px',
      padding: '40px 30px 30px',
      maxWidth: '460px',
      margin: '0 auto',
      borderRadius: '46% 54% 58% 42% / 54% 44% 56% 46%',
      background:
        'linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.6) 42%, rgba(0,0,0,0.18) 76%, rgba(0,0,0,0) 100%)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: '0 26px 80px rgba(0,0,0,0.6)',
    }}
  >
    {THEMES.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onPick(t.id)}
        aria-label={`Enter site in ${t.label} theme`}
        title={t.label}
        style={{
          width: '96px',
          height: '96px',
          margin: '5px',
          border: 'none',
          cursor: 'pointer',
          borderRadius: t.radius,
          background: t.bg,
          color: t.fg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          transition: 'transform 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.1)';
          e.currentTarget.style.filter = 'brightness(1.18)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.55)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.filter = '';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.45)';
        }}
      >
        {t.icon}
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {t.label}
        </span>
      </button>
    ))}
  </div>
);
