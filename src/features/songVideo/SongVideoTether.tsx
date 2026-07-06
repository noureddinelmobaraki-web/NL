import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useSongVideoStore } from './songVideoStore';
import { useAnchorRect } from './useAnchorRect';
import { useTetherGeometry } from './useTetherGeometry';
import { useDeviceType } from '../../hooks/useDeviceType';
import { TetherRope } from './TetherRope';
import { TetherVideoBox } from './TetherVideoBox';
import '../../styles/song-video-tether.css';

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10060,
  background: 'rgba(4, 6, 10, 0.45)',
};

export function SongVideoTether() {
  const open = useSongVideoStore((s) => s.open);
  const videoId = useSongVideoStore((s) => s.videoId);
  const anchorEl = useSongVideoStore((s) => s.anchorEl);
  const close = useSongVideoStore((s) => s.close);
  const { isMobile } = useDeviceType();

  const rect = useAnchorRect(anchorEl, open);
  const geo = useTetherGeometry(rect, isMobile);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !videoId || !geo) return null;

  return createPortal(
    <>
      <div style={backdropStyle} onClick={close} />
      <TetherRope geo={geo} />
      <TetherVideoBox geo={geo} videoId={videoId} onClose={close} />
    </>,
    document.body,
  );
}

export default SongVideoTether;
