import React from 'react';
import { Headphones, Video, Disc3, Sparkles } from 'lucide-react';
import { GlassVectorIcon } from '../../../../components/shared/icons';

export interface SpacetoonOstTrack {
  id: string;
  titleAr: string;
  seriesTitleAr: string;
  vocalistAr: string;
  planetLabelAr: string;
  year: number;
  posterUrl: string;
  backdropUrl: string;
  audioStreamUrl: string;
  videoEmbedUrl: string;
}

export interface SpacetoonThemeSongCardProps {
  track: SpacetoonOstTrack;
  isActive: boolean;
  activeMode: 'audio' | 'video';
  onSelectTrack: (track: SpacetoonOstTrack, mode: 'audio' | 'video') => void;
}

export const SpacetoonThemeSongCard: React.FC<SpacetoonThemeSongCardProps> = ({
  track,
  isActive,
  activeMode,
  onSelectTrack,
}) => {
  return (
    <div
      className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col ${
        isActive
          ? 'bg-teal-500/15 border-teal-300/65 shadow-[0_0_30px_rgba(45,212,191,0.3)]'
          : 'bg-slate-900/65 border-white/15 hover:border-white/35 shadow-xl'
      }`}
      style={{
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }}
    >
      {/* Poster Image with Glass Sheen */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <img
          src={track.posterUrl}
          alt={track.titleAr}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 border border-white/25 backdrop-blur-md text-[10px] font-extrabold text-teal-200">
          <GlassVectorIcon icon={Sparkles} theme="emerald" size={12} badge={false} />
          <span>{track.planetLabelAr}</span>
        </div>

        {isActive && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-teal-500/85 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow">
            <Disc3 size={12} className="animate-spin" />
            <span>قيد التشغيل</span>
          </div>
        )}
      </div>

      {/* Song Info & Dual Audio/Video Mode Buttons */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-white truncate">{track.titleAr}</h3>
          <p className="text-xs font-bold text-teal-300 truncate">
            أداء: {track.vocalistAr}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {track.seriesTitleAr} · {track.year}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => onSelectTrack(track, 'audio')}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isActive && activeMode === 'audio'
                ? 'bg-teal-400 text-slate-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            <Headphones size={13} />
            <span>استماع صوتي</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTrack(track, 'video')}
            className={`py-2 px-2.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isActive && activeMode === 'video'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            <Video size={13} />
            <span>فيديو الشارة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
