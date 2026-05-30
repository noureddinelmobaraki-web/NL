import { memo } from 'react';

interface MoodControlsProps {
  audioStatus: 'idle' | 'loading' | 'playing' | 'paused';
  handlePlayPause: () => void;
  pickRandomSong: () => void;
  diceSpinning: boolean;
}

export const MoodControls = memo(({
  audioStatus,
  handlePlayPause,
  pickRandomSong,
  diceSpinning,
}: MoodControlsProps) => {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
      }}
    >
      {/* زر Play/Pause */}
      <button
        onClick={handlePlayPause}
        aria-label={audioStatus === 'playing' ? 'إيقاف مؤقت' : 'تشغيل'}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '1.5px solid rgba(0,0,0,0.15)',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          color: 'rgba(0,0,0,0.5)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.5)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.9)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.15)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.5)';
        }}
      >
        {audioStatus === 'playing' ? (
          // ■■ Pause
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          // ▶ Play
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <polygon points="3,2 14,8 3,14" />
          </svg>
        )}
      </button>

      {/* نرد العشوائية — SVG ثلاثي الأبعاد */}
      <button
        onClick={pickRandomSong}
        aria-label="أغنية عشوائية"
        title="أغنية عشوائية"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '1.5px solid rgba(0,0,0,0.12)',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          animation: diceSpinning ? 'moodDiceSpin 0.55s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'rgba(0,0,0,0.4)';
          b.style.transform = 'scale(1.1) rotate(-8deg)';
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'rgba(0,0,0,0.12)';
          b.style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        {/* SVG نرد ثلاثي الأبعاد — يُظهر وجه 3 */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* الوجه الأمامي (فاتح) */}
          <path
            d="M10 35 L50 15 L90 35 L90 75 L50 95 L10 75 Z"
            fill="rgba(0,0,0,0.07)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* الوجه الأيمن (أغمق — ظل) */}
          <path
            d="M50 15 L90 35 L90 75 L50 55 Z"
            fill="rgba(0,0,0,0.18)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* الوجه العلوي (أفتح — ضوء) */}
          <path
            d="M10 35 L50 15 L90 35 L50 55 Z"
            fill="rgba(0,0,0,0.04)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* نقاط الوجه الأمامي — يُظهر رقم 3 */}
          {/* نقطة يسار أعلى */}
          <circle cx="28" cy="48" r="5" fill="rgba(0,0,0,0.6)" />
          {/* نقطة وسط */}
          <circle cx="50" cy="65" r="5" fill="rgba(0,0,0,0.6)" />
          {/* نقطة يمين أسفل */}
          <circle cx="72" cy="78" r="5" fill="rgba(0,0,0,0.6)" />

          {/* نقاط الوجه العلوي — رقم 2 */}
          <circle cx="36" cy="28" r="3.5" fill="rgba(0,0,0,0.35)" />
          <circle cx="64" cy="40" r="3.5" fill="rgba(0,0,0,0.35)" />
        </svg>
      </button>
    </div>
  );
});
