import { useDeviceType } from '../../hooks/useDeviceType';
import { ResponsiveImage } from '../ResponsiveImage';

export interface MeBitThumbnailsProps {
  images: string[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  isMeBitPlaying: boolean;
  onToggleAudio: () => void;
}

export const MeBitThumbnails = ({
  images,
  selectedIndex,
  onSelectIndex,
  isMeBitPlaying: _isMeBitPlaying,
  onToggleAudio: _onToggleAudio,
}: MeBitThumbnailsProps) => {
  const { isMobile, isTablet } = useDeviceType();

  // Mobile thumbnail strip
  if (isMobile) {
    return (
      <div className="order-2 w-full h-[100px] overflow-x-auto flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-black/50 backdrop-blur-md">
        {images.map((src, idx) => (
          <button
            key={idx}
            onClick={() => onSelectIndex(idx)}
            className={`relative h-full aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all duration-305 shrink-0
              ${selectedIndex === idx ? 'border-white scale-95' : 'border-transparent opacity-50'}`}
            aria-label={`View moment ${idx + 1}`}
          >
            <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    );
  }

  // Tablet thumbnail strip
  if (isTablet) {
    return (
      <div className="order-2 w-full h-[120px] overflow-x-auto flex items-center gap-3 px-4 py-3 border-t border-white/10 bg-black/50">
        {images.map((src, idx) => (
          <button
            key={idx}
            onClick={() => onSelectIndex(idx)}
            className={`relative h-full aspect-square rounded-xl border-2 overflow-hidden shrink-0 transition-all
              ${selectedIndex === idx ? 'border-white scale-95' : 'border-transparent opacity-50 hover:opacity-80'}`}
            aria-label={`View moment ${idx + 1}`}
          >
            <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="w-full md:w-96 flex flex-col gap-6 glass-morphism p-6 rounded-3xl overflow-hidden shadow-2xl">
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex flex-col">
          <h3 className="font-manga text-white text-2xl tracking-tight leading-none uppercase">Shot Archive</h3>
          <span className="font-hand text-zinc-400 text-sm mt-1 italic">Moments in time</span>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full text-zinc-100 font-mono text-xs">
          {selectedIndex !== null ? selectedIndex + 1 : 0} / {images.length}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-2 custom-scrollbar pb-4 content-start">
        {images.map((src, idx) => (
          <button
            key={idx}
            onClick={() => onSelectIndex(idx)}
            className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-300 transform
              ${selectedIndex === idx
                ? 'border-white scale-95 shadow-[0_0_20px_white/20] ring-4 ring-white/10'
                : 'border-transparent hover:border-white/30 opacity-40 hover:opacity-100 hover:scale-[1.02]'}`}
            aria-label={`Select archive moment ${idx + 1}`}
          >
            <ResponsiveImage src={src} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
            {selectedIndex === idx && (
              <div className="absolute inset-0 bg-white/10" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
