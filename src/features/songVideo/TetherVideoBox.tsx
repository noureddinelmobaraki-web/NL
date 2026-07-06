import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import type { TetherGeometry } from './useTetherGeometry';

interface TetherVideoBoxProps {
  geo: TetherGeometry;
  videoId: string;
  onClose: () => void;
}

export function TetherVideoBox({ geo, videoId, onClose }: TetherVideoBoxProps) {
  const boxStyle: CSSProperties = {
    position: 'fixed',
    left: geo.box.left,
    top: geo.box.top,
    width: geo.box.width,
    height: geo.box.height,
    zIndex: 10080,
  };
  const src =
    'https://www.youtube-nocookie.com/embed/' + videoId +
    '?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3';

  return (
    <div className="nl-tether-box" style={boxStyle} role="dialog" aria-label="Video">
      <iframe
        className="nl-tether-iframe"
        src={src}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <button
        type="button"
        className="nl-tether-vclose"
        onClick={onClose}
        aria-label="Close video"
      >
        <X size={15} />
      </button>
    </div>
  );
}
