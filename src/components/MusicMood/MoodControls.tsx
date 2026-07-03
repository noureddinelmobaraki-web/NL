// src/components/MusicMood/MoodControls.tsx // DICE-UPGRADE

import { memo, useState } from 'react';
import { useDeviceType } from '../../hooks/useDeviceType';

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
  const { isDesktop } = useDeviceType();
  const [diceFace, setDiceFace] = useState(3);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});

  const faceRotations: Record<number, string> = {
    1: 'rotateY(0deg)',
    2: 'rotateY(-90deg)',
    3: 'rotateX(-90deg)',
    4: 'rotateX(90deg)',
    5: 'rotateY(90deg)',
    6: 'rotateY(180deg)',
  };

  const renderDots = (count: number) => {
    const dotStyle: React.CSSProperties = {
      width: '5px',
      height: '5px',
      borderRadius: '50%',
      backgroundColor: 'rgba(20,20,30,0.78)',
      position: 'absolute',
    };

    const positions: Record<number, React.CSSProperties[]> = {
      1: [{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
      2: [
        { top: '20%', left: '20%' },
        { bottom: '20%', right: '20%' },
      ],
      3: [
        { top: '20%', left: '20%' },
        { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        { bottom: '20%', right: '20%' },
      ],
      4: [
        { top: '20%', left: '20%' },
        { top: '20%', right: '20%' },
        { bottom: '20%', left: '20%' },
        { bottom: '20%', right: '20%' },
      ],
      5: [
        { top: '20%', left: '20%' },
        { top: '20%', right: '20%' },
        { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        { bottom: '20%', left: '20%' },
        { bottom: '20%', right: '20%' },
      ],
      6: [
        { top: '20%', left: '20%' },
        { top: '20%', right: '20%' },
        { top: '50%', left: '20%', transform: 'translateY(-50%)' },
        { top: '50%', right: '20%', transform: 'translateY(-50%)' },
        { bottom: '20%', left: '20%' },
        { bottom: '20%', right: '20%' },
      ],
    };

    return positions[count].map((pos, i) => <div key={i} style={{ ...dotStyle, ...pos }} />);
  };

  const handleDiceClick = () => {
    // Triggers direct tactile haptic click pattern roll-land-bounce if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([10, 30, 10]);
      } catch (e) {
        // Safe check
      }
    }
    // Randomize the next rolled face number (1-6)
    const nextFace = Math.floor(Math.random() * 6) + 1;
    setDiceFace(nextFace);
    pickRandomSong();
  };

  // Dynamic real-time 3D tilt tracking mapped to mouse vector coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDesktop) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    const rotateX = -(y / (rect.height / 2)) * 14;
    const rotateY = (x / (rect.width / 2)) * 14;
    
    setTiltStyle({
      transform: `translateY(-2px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`,
      boxShadow: '0 12px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.4)',
    });
  };

  const handleMouseLeave = () => {
    if (!isDesktop) return;
    setTiltStyle({});
  };

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
      <style>{`
        .dice-face {
          position: absolute;
          width: 100%; height: 100%;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,240,250,0.85));
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 5px;
          box-shadow: inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(0,0,0,0.08);
          display: flex; align-items: center; justify-content: center;
          backface-visibility: hidden;
        }
        .dice-face-front  { transform: translateZ(16px); }
        .dice-face-back   { transform: translateZ(-16px) rotateY(180deg); }
        .dice-face-right  { transform: rotateY(90deg) translateZ(16px); }
        .dice-face-left   { transform: rotateY(-90deg) translateZ(16px); }
        .dice-face-top    { transform: rotateX(90deg) translateZ(16px); }
        .dice-face-bottom { transform: rotateX(-90deg) translateZ(16px); }

        @keyframes diceTumble {
          0%   { transform: rotateX(0)     rotateY(0)     rotateZ(0);     }
          25%  { transform: rotateX(180deg) rotateY(90deg)  rotateZ(45deg)  scale(1.1); }
          50%  { transform: rotateX(360deg) rotateY(180deg) rotateZ(0deg)  scale(1.15) scaleX(1.2) scaleY(0.8); }
          65%  { transform: rotateX(460deg) rotateY(280deg) rotateZ(-20deg) scaleX(0.9) scaleY(1.1); }
          75%  { transform: rotateX(540deg) rotateY(360deg) rotateZ(-30deg) scale(1.05); }
          100% { transform: rotateX(720deg) rotateY(540deg) rotateZ(0);     }
        }
        .dice-cube.spinning { animation: diceTumble 0.95s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>

      {/* زر Play/Pause -- DICE-UPGRADE */}
      <div className="relative group/play">
        <button
          onClick={handlePlayPause}
          aria-label={audioStatus === 'playing' ? 'Pause' : 'Play'}
          className="w-[52px] h-[52px] lg:w-[56px] lg:h-[56px] rounded-full border-[1.5px] border-[rgba(0,0,0,0.12)] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.05)_0%,transparent_60%)] flex items-center justify-center transition-all duration-200 ease-out cursor-pointer text-[rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60 focus-visible:outline-offset-4 hover:scale-108 hover:border-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.9)] active:scale-94"
        >
          {audioStatus === 'playing' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="3,2 14,8 3,14" />
            </svg>
          )}
        </button>
      </div>

      {/* نرد العشوائية — CSS 3D Cube -- DICE-UPGRADE */}
      <div className="relative group/dice" style={{ perspective: '800px' }}>
        <button
          onClick={handleDiceClick}
          aria-label="Random Song"
          className="w-[52px] h-[52px] lg:w-[56px] lg:h-[56px] rounded-full border-[1.5px] border-[rgba(0,0,0,0.12)] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.05)_0%,transparent_60%)] flex items-center justify-center transition-all duration-250 cursor-pointer p-0 active:scale-94 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60 focus-visible:outline-offset-4"
          style={{
            transformStyle: 'preserve-3d',
            ...tiltStyle,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Shadow during flight */}
          <div style={{
            width: '30px', height: '6px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.12)',
            position: 'absolute', bottom: '-10px', left: '50%',
            transform: 'translateX(-50%)',
            opacity: diceSpinning ? 0.6 : 0,
            transition: 'opacity 150ms',
          }} />

          {/* CSS 3D Cube */}
          <div
            className={`dice-cube ${diceSpinning ? 'spinning' : ''}`}
            style={{
              width: isDesktop ? '32px' : '28px',
              height: isDesktop ? '32px' : '28px',
              transformStyle: 'preserve-3d',
              perspective: '600px',
              transform: faceRotations[diceFace],
              transition: diceSpinning ? 'none' : 'transform 300ms ease',
            }}
          >
            {(['front', 'back', 'right', 'left', 'top', 'bottom'] as const).map((face, i) => (
              <div key={face} className={`dice-face dice-face-${face}`}>
                {renderDots([1, 6, 2, 5, 3, 4][i])}
              </div>
            ))}
          </div>
        </button>

        {/* Floating Tooltip (desktop only) */}
        <span 
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 rounded bg-neutral-900/90 px-3 py-1.5 text-center text-[11px] font-medium tracking-wide text-white opacity-0 transition-all duration-200 delay-500 group-hover/dice:opacity-100 hidden lg:block shadow-md whitespace-nowrap border border-white/10"
          style={{ transformOrigin: 'bottom center' }}
        >
          Random Song / Roll for a random song
        </span>
      </div>
    </div>
  );
});
