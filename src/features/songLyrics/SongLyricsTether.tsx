import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSongLyricsStore } from './songLyricsStore';
import { useTetherGeometry } from './useTetherGeometry';
import { TetherRope } from './TetherRope';
import { TetherLyricsBox } from './TetherLyricsBox';
import '../../styles/components/song-lyrics-tether.css';

export const SongLyricsTether = () => {
  const song = useSongLyricsStore((s) => s.song);
  const anchorEl = useSongLyricsStore((s) => s.anchorEl);
  const getCurrentTime = useSongLyricsStore((s) => s.getCurrentTime);
  const onSeek = useSongLyricsStore((s) => s.onSeek);
  const close = useSongLyricsStore((s) => s.close);

  const geom = useTetherGeometry({ anchorEl, active: !!song && !!anchorEl });

  useEffect(() => {
    if (!song) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [song, close]);

  if (!song || !anchorEl || !geom) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
  };
  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: geom.bx,
    top: geom.by,
    width: geom.bw,
    height: geom.bh,
    pointerEvents: 'auto',
  };

  return createPortal(
    <div className="nl-lyr-overlay" style={overlayStyle}>
      <div className="nl-lyr-scrim" onClick={close} />
      <TetherRope path={geom.ropePath} />
      <div className="nl-lyr-tetherbox" style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <TetherLyricsBox song={song} getCurrentTime={getCurrentTime} onSeek={onSeek} />
      </div>
    </div>,
    document.body,
  );
};
