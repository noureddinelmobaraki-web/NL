import { useState } from 'react';
import { Heart, Activity, Download, Loader2 } from 'lucide-react';
import { Track } from '../engine/types';
import { downloadTrack } from '../data/downloadTrack';
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
}

export function SongRow({ 
  song, isSelected, isFav, rowHeight, offsetTop, 
  onPlay, onToggleFav, formatTime 
}: SongRowProps) {
  const [dl, setDl] = useState<'idle' | 'start' | 'done' | 'error'>('idle');

  return (
    <div
      onClick={() => onPlay(song.id)}
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
        <div className="flex-grow overflow-hidden px-1">
          <div className="flex items-center gap-2">
            {isSelected && <Activity size={16} className="text-[#34E89E] shrink-0 animate-pulse" />}
            <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{song.title}</h4>
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
            className="p-1.5 text-slate-700 opacity-30 group-hover:opacity-100 hover:text-[#FF7A1A] transition-colors disabled:opacity-50"
            title="Download"
            disabled={dl === 'start'}
            onClick={(e) => { e.stopPropagation(); downloadTrack({ url: song.src, title: song.title }, setDl); }}
          >
            {dl === 'start' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
          <div className="text-xs font-mono text-slate-600 opacity-80">
            {formatTime(song.durationSec)}
          </div>
        </div>
      </div>
    </div>
  );
}
