import { useEffect, useRef, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Camera, Music2, Pencil, Aperture, Gamepad2, Clapperboard, Tv, Monitor, AudioLines, Users } from 'lucide-react';
import { NavButton } from '../NavButton';
import { audioManager } from '../../audio/audioManager';
import { itemVariants } from './appConstants';
import { useTranslation } from 'react-i18next';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';
import { useAppContext } from '../../context/AppContext';

interface AppNavGridProps {
  resolvedTheme: string;
  onScrollToSection: (id: string) => void;
  onOpenLens: () => void;
}

interface TubeGeometry {
  width: number;
  height: number;
  d: string;
}

function buildWormTubePath(gridEl: HTMLDivElement): TubeGeometry | null {
  const buttons = Array.from(gridEl.querySelectorAll<HTMLElement>('.nl-top-nav__button'));
  if (buttons.length === 0) return null;

  const gridRect = gridEl.getBoundingClientRect();
  const width = Math.max(1, Math.round(gridRect.width));
  const height = Math.max(56, Math.round(gridRect.height));
  if (width <= 10) return null;

  const cy = height / 2;
  const bulgeHalfH = Math.min(24.5, height * 0.45);
  const waistHalfH = 11.2;

  const nodes = buttons.map((btn) => {
    const r = btn.getBoundingClientRect();
    const left = r.left - gridRect.left;
    const right = r.right - gridRect.left;
    const w = Math.max(44, right - left);
    const pad = Math.max(0, (w - 44) / 2);
    return {
      left,
      right,
      cx: (left + right) / 2,
      capL: left + 22 - Math.min(8, pad * 0.15),
      capR: right - 22 + Math.min(8, pad * 0.15),
    };
  });

  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const leftEdge = Math.max(2, first.left - 3);
  const rightEdge = Math.min(width - 2, last.right + 3);

  let d = `M ${first.capL.toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}`;

  for (let i = 0; i < nodes.length; i++) {
    const cur = nodes[i];
    if (cur.capR > cur.capL + 0.5) {
      d += ` L ${cur.capR.toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}`;
    }
    if (i < nodes.length - 1) {
      const next = nodes[i + 1];
      const midX = (cur.right + next.left) / 2;
      const span1 = Math.max(4, midX - cur.capR);
      const span2 = Math.max(4, next.capL - midX);
      d += ` C ${(cur.capR + span1 * 0.52).toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}, ${(midX - span1 * 0.44).toFixed(1)} ${(cy - waistHalfH).toFixed(1)}, ${midX.toFixed(1)} ${(cy - waistHalfH).toFixed(1)}`;
      d += ` C ${(midX + span2 * 0.44).toFixed(1)} ${(cy - waistHalfH).toFixed(1)}, ${(next.capL - span2 * 0.52).toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}, ${next.capL.toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}`;
    }
  }

  // Right rounded cap
  d += ` C ${(rightEdge + 2).toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}, ${(rightEdge + 2).toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}, ${last.capR.toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}`;

  // Bottom contour (right to left)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const cur = nodes[i];
    if (cur.capR > cur.capL + 0.5) {
      d += ` L ${cur.capL.toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}`;
    }
    if (i > 0) {
      const prev = nodes[i - 1];
      const midX = (prev.right + cur.left) / 2;
      const span1 = Math.max(4, cur.capL - midX);
      const span2 = Math.max(4, midX - prev.capR);
      d += ` C ${(cur.capL - span1 * 0.52).toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}, ${(midX + span1 * 0.44).toFixed(1)} ${(cy + waistHalfH).toFixed(1)}, ${midX.toFixed(1)} ${(cy + waistHalfH).toFixed(1)}`;
      d += ` C ${(midX - span2 * 0.44).toFixed(1)} ${(cy + waistHalfH).toFixed(1)}, ${(prev.capR + span2 * 0.52).toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}, ${prev.capR.toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}`;
    }
  }

  // Left rounded cap
  d += ` C ${(leftEdge - 2).toFixed(1)} ${(cy + bulgeHalfH).toFixed(1)}, ${(leftEdge - 2).toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)}, ${first.capL.toFixed(1)} ${(cy - bulgeHalfH).toFixed(1)} Z`;

  return { width, height, d };
}

export function AppNavGrid({
  resolvedTheme,
  onScrollToSection,
  onOpenLens,
}: AppNavGridProps) {
  const { t, i18n } = useTranslation();
  const { openGames, openMovies, openTv, openXp, openMusic, openAccounts } = useAppContext();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const rafLoopRef = useRef<number | null>(null);
  const [tube, setTube] = useState<TubeGeometry>({
    width: 620,
    height: 58,
    d: 'M 28 5 L 592 5 A 24 24 0 0 1 592 53 L 28 53 A 24 24 0 0 1 28 5 Z',
  });

  const updateTubeGeometry = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const next = buildWormTubePath(el);
    if (next) {
      setTube((prev) =>
        prev.width === next.width && prev.height === next.height && prev.d === next.d ? prev : next
      );
    }
  }, []);

  const triggerSmoothTrack = useCallback(() => {
    if (rafLoopRef.current !== null) {
      cancelAnimationFrame(rafLoopRef.current);
    }
    const start = performance.now();
    const tick = (now: number) => {
      updateTubeGeometry();
      if (now - start < 480) {
        rafLoopRef.current = requestAnimationFrame(tick);
      } else {
        rafLoopRef.current = null;
      }
    };
    rafLoopRef.current = requestAnimationFrame(tick);
  }, [updateTubeGeometry]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    updateTubeGeometry();
    const ro = new ResizeObserver(() => {
      updateTubeGeometry();
    });
    ro.observe(el);
    Array.from(el.querySelectorAll('.nl-top-nav__button')).forEach((btn) => ro.observe(btn));

    window.addEventListener('resize', updateTubeGeometry, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateTubeGeometry);
      if (rafLoopRef.current !== null) {
        cancelAnimationFrame(rafLoopRef.current);
      }
    };
  }, [updateTubeGeometry]);

  const moviesSeriesLabel = i18n.exists('nav.movies_and_series') ? t('nav.movies_and_series') : 
    (i18n.exists('nav.movies') && i18n.exists('nav.series') 
      ? `${t('nav.movies')} & ${t('nav.series')}` 
      : "Movies & Series");

  return (
    <m.div 
      variants={itemVariants} 
      className="nl-top-nav nl-top-nav--worm"
      role="navigation"
      aria-label="Primary Sections"
    >
      <div
        ref={gridRef}
        className="nl-top-nav__grid"
        onMouseOver={triggerSmoothTrack}
        onMouseOut={triggerSmoothTrack}
        onFocusCapture={triggerSmoothTrack}
        onBlurCapture={triggerSmoothTrack}
      >
        <svg
          className="nl-top-nav__tube-svg"
          viewBox={`0 0 ${tube.width} ${tube.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="nl-worm-tube-clip">
              <path d={tube.d} />
            </clipPath>
            <linearGradient id="nl-worm-glass-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 232, 238, 0.34)" />
              <stop offset="28%" stopColor="rgba(255, 77, 109, 0.14)" />
              <stop offset="68%" stopColor="rgba(34, 4, 12, 0.56)" />
              <stop offset="100%" stopColor="rgba(10, 1, 4, 0.80)" />
            </linearGradient>
            <linearGradient id="nl-worm-rim-stroke" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 240, 245, 0.92)" />
              <stop offset="45%" stopColor="rgba(255, 105, 135, 0.42)" />
              <stop offset="100%" stopColor="rgba(18, 2, 6, 0.88)" />
            </linearGradient>
            <radialGradient id="nl-worm-red-smoke-a" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 38, 78, 0.52)" />
              <stop offset="52%" stopColor="rgba(190, 10, 42, 0.26)" />
              <stop offset="100%" stopColor="rgba(120, 4, 24, 0)" />
            </radialGradient>
            <radialGradient id="nl-worm-red-smoke-b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 92, 122, 0.44)" />
              <stop offset="58%" stopColor="rgba(165, 8, 36, 0.22)" />
              <stop offset="100%" stopColor="rgba(80, 2, 16, 0)" />
            </radialGradient>
          </defs>

          <g clipPath="url(#nl-worm-tube-clip)">
            <path d={tube.d} fill="url(#nl-worm-glass-fill)" />
            <g className="nl-worm-smoke">
              <ellipse
                className="nl-worm-smoke__wisp nl-worm-smoke__wisp--1"
                cx={tube.width * 0.22}
                cy={tube.height * 0.52}
                rx={115}
                ry={26}
                fill="url(#nl-worm-red-smoke-a)"
              />
              <ellipse
                className="nl-worm-smoke__wisp nl-worm-smoke__wisp--2"
                cx={tube.width * 0.54}
                cy={tube.height * 0.48}
                rx={135}
                ry={28}
                fill="url(#nl-worm-red-smoke-b)"
              />
              <ellipse
                className="nl-worm-smoke__wisp nl-worm-smoke__wisp--3"
                cx={tube.width * 0.82}
                cy={tube.height * 0.54}
                rx={110}
                ry={25}
                fill="url(#nl-worm-red-smoke-a)"
              />
            </g>
            <rect
              x="0"
              y="0"
              width={tube.width}
              height={tube.height * 0.45}
              fill="rgba(255, 255, 255, 0.12)"
            />
          </g>

          <path
            d={tube.d}
            fill="none"
            stroke="url(#nl-worm-rim-stroke)"
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
        </svg>

        <NavButton 
          index={0}
          icon={Camera} 
          label={t('nav.mebit').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            onScrollToSection('me-bit-gallery');
          }} 
          theme={resolvedTheme} 
        />
        <NavButton 
          index={1}
          icon={Music2} 
          label={t('nav.songs').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            onScrollToSection('my-songs-section');
          }} 
          theme={resolvedTheme} 
        />
        <NavButton 
          index={2}
          icon={Pencil} 
          label={t('nav.drawings').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            onScrollToSection('drawings-section');
          }} 
          theme={resolvedTheme} 
        />
        <NavButton 
          index={3}
          icon={Aperture} 
          label={t('nav.lens').toUpperCase()} 
          onClick={(e) => { 
            setGenieOriginFromElement(e.currentTarget);
            audioManager.play('lens'); 
            onOpenLens(); 
          }} 
          theme={resolvedTheme} 
        />
        <NavButton 
          index={4}
          icon={Gamepad2} 
          label={t('nav.games').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            openGames();
          }} 
          onMouseEnter={() => {
            import('../Games/GamesPage').catch(() => {});
          }}
          onPointerDown={() => {
            import('../Games/GamesPage').catch(() => {});
          }}
          theme={resolvedTheme} 
        />
        <NavButton 
          index={5}
          icon={Clapperboard} 
          label={moviesSeriesLabel.toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            openMovies();
          }} 
          onMouseEnter={() => {
            import('../Movies/MoviesPage').catch(() => {});
          }}
          onPointerDown={() => {
            import('../Movies/MoviesPage').catch(() => {});
          }}
          theme={resolvedTheme} 
        />
        <NavButton
          index={6}
          icon={Users}
          label={(i18n.exists('nav.accounts') ? t('nav.accounts') : 'Accounts').toUpperCase()}
          onClick={(e) => { setGenieOriginFromElement(e.currentTarget); openAccounts(); }}
          onMouseEnter={() => { import('../../features/accounts/AccountsPage').catch(() => {}); }}
          onPointerDown={() => { import('../../features/accounts/AccountsPage').catch(() => {}); }}
          theme={resolvedTheme}
        />
        <NavButton 
          index={7}
          icon={Tv} 
          label={t('nav.nltv').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            openTv();
          }} 
          onMouseEnter={() => {
            import('../NlTv/NlTvPage').catch(() => {});
          }}
          onPointerDown={() => {
            import('../NlTv/NlTvPage').catch(() => {});
          }}
          theme={resolvedTheme} 
        />
        <NavButton 
          index={8}
          icon={Monitor} 
          label={t('xp.nav').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            openXp();
          }} 
          onMouseEnter={() => {
            import('../WindowsXp/WindowsXpPage').catch(() => {});
          }}
          onPointerDown={() => {
            import('../WindowsXp/WindowsXpPage').catch(() => {});
          }}
          theme={resolvedTheme} 
        />
        <NavButton 
          index={9}
          icon={AudioLines} 
          label={t('nav.music').toUpperCase()} 
          onClick={(e) => {
            setGenieOriginFromElement(e.currentTarget);
            openMusic();
          }} 
          onMouseEnter={() => {
            import('../../features/music/MusicPage').catch(() => {});
          }}
          onPointerDown={() => {
            import('../../features/music/MusicPage').catch(() => {});
          }}
          theme={resolvedTheme} 
        />
      </div>
    </m.div>
  );
}
