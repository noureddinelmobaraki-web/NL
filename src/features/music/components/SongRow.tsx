import { useState } from 'react';
import { Heart, Activity, Download, Loader2, CheckCircle2, Check, Share2 } from 'lucide-react';
import { Track } from '../engine/types';
import { useMusicStore } from '../store/musicStore';
import { shareSong } from '../data/shareSong';
import styles from '../music.module.css';

interface SongRowProps {
  song: Track;
  isSelected: boolean;
  isFav: boolean;
  rowHeight: number;
  offsetTop: number;
  onPlay: (id: string) => void;
  onToggleFav: (id: string) => void;
  formatTime: (sec?: number) => string;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function SongRow({ 
  song, isSelected, isFav, rowHeight, offsetTop, 
  onPlay, onToggleFav, formatTime,
  selectable = false, selected = false, onToggleSelect,
}: SongRowProps) {
  const [dl, setDl] = useState<'idle' | 'start' | 'done' | 'error'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
  const isSaved = useMusicStore((s) => s.downloaded.includes(song.id));
  const offlineActions = useMusicStore((s) => s.actions);

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await shareSong(song);
    setShareState(res);
    setTimeout(() => setShareState('idle'), 2000);
  };

  return (
    <div
      onClick={() => (selectable ? onToggleSelect?.(song.id) : onPlay(song.id))}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: rowHeight,
        transform: `translateY(${offsetTop}px)`
      }}
      className="px-1 py-0.5"
    >
      <div className={`group flex items-center h-full gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 ${styles['nlp-row']} ${
        isSelected 
          ? 'bg-white/80 shadow-[0_4px_15px_rgba(52,232,158,0.25)] border border-[#34E89E]/60 scale-[1.02] translate-x-1' 
          : 'hover:bg-white/40 border border-transparent'
      }`}>
        {selectable && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(song.id); }}
            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-[#FF7A1A] border-[#FF7A1A] text-white' : 'border-slate-400 text-transparent hover:border-[#FF7A1A]'}`}
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            <Check size={14} />
          </button>
        )}
        <div className="flex-grow overflow-hidden px-1">
          <div className="flex items-center gap-2">
            {isSelected && <Activity size={16} className="text-[#34E89E] shrink-0 animate-pulse" />}
            <h4 className={`text-sm font-bold truncate ${isSaved ? 'text-[#00B894]' : isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{song.title}</h4>
            {isSaved && (
              <span title="Available offline" className="shrink-0 text-[#00E676]">
                <CheckCircle2 size={13} />
              </span>
            )}
          </div>
          <p className={`text-xs truncate ${isSelected ? 'text-slate-700' : 'text-slate-600'}`}>{song.artist}</p>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFav(song.id); }} 
            className={`p-1.5 rounded-full transition-colors ${isFav ? 'text-red-500' : 'text-slate-700 opacity-30 group-hover:opacity-100 hover:text-slate-900'}`}
          >
            <Heart size={16} fill={isFav ? "currentColor" : "none"} />
          </button>
          <button
            className={`p-1.5 transition-colors disabled:opacity-50 ${isSaved ? 'text-[#00E676] opacity-100' : 'text-slate-700 opacity-30 group-hover:opacity-100 hover:text-[#FF7A1A]'}`}
            title={isSaved ? 'Saved offline — tap to remove' : 'Save offline'}
            disabled={dl === 'start'}
            onClick={(e) => {
              e.stopPropagation();
              if (isSaved) { offlineActions.removeOffline(song); return; }
              setDl('start');
              offlineActions.saveOffline(song).finally(() => setDl('idle'));
            }}
          >
            {dl === 'start'
              ? <Loader2 size={16} className="animate-spin" />
              : isSaved ? <CheckCircle2 size={16} /> : <Download size={16} />}
          </button>
          <button
            onClick={handleShareClick}
            className={`p-1.5 transition-colors rounded-full text-slate-700 opacity-30 group-hover:opacity-100 hover:text-[#34E89E] ${
              shareState !== 'idle' ? 'text-[#00E676] opacity-100 scale-110' : ''
            }`}
            title="مشاركة الأغنية"
          >
            {shareState === 'copied' || shareState === 'shared' ? (
              <Check size={16} className="text-[#00E676]" />
            ) : (
              <Share2 size={16} />
            )}
          </button>
          <div className="text-xs font-mono text-slate-600 opacity-80">
            {formatTime(song.durationSec)}
          </div>
        </div>
      </div>
    </div>
  );
}
