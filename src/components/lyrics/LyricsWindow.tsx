import { Music } from 'lucide-react';
import { Song, WindowGeometry, LyricLine } from '../../types';
import { WindowFrame } from './WindowFrame';
import { LyricsWindowContent } from './LyricsWindowContent';

export const LyricsWindow = ({ 
  song, 
  currentTime, 
  onClose, 
  onSeek,
  geometry, 
  setGeometry, 
  zIndex, 
  onFocus,
  isFocused,
  lyrics,
  songBackground
}: { 
  song: Song; 
  currentTime: number; 
  onClose: () => void; 
  onSeek: (time: number) => void;
  geometry: WindowGeometry;
  setGeometry: (g: WindowGeometry) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  lyrics: LyricLine[];
  songBackground?: string;
}) => {
  return (
    <WindowFrame
      title={`Lyrics - ${song.title}`}
      icon={Music}
      geometry={geometry}
      setGeometry={setGeometry}
      zIndex={zIndex}
      onFocus={onFocus}
      isFocused={isFocused}
      onClose={onClose}
    >
      <div className="flex-1 overflow-hidden relative">
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: songBackground ? `url('${songBackground}')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px) brightness(0.4) saturate(0.7)',
          transform: 'scale(1.1)',
          borderRadius: 'inherit',
        }}>
        </div>
        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          <LyricsWindowContent currentTime={currentTime} onSeek={onSeek} lyrics={lyrics} />
        </div>
      </div>
    </WindowFrame>
  );
};
