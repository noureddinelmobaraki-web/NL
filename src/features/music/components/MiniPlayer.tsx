import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import { selectCurrentTrack } from '../store/selectors';
import { TrackCover } from './TrackCover';
import styles from '../music.module.css';

interface MiniPlayerProps {
  onOpen: () => void;
}

export function MiniPlayer({ onOpen }: MiniPlayerProps) {
  const currentTrack = useMusicStore(selectCurrentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTime = useMusicStore((s) => s.currentTime);
  const actions = useMusicStore((s) => s.actions);

  if (!currentTrack) return null;

  const duration = (currentTrack as any).durationSec || 1;
  const progress = (currentTime / duration) * 100;

  return (
    <div 
      className={`h-20 flex items-center px-4 gap-3 z-[8600] active:scale-[0.98] transition-transform ${styles['nlp-mini']}`}
      onClick={onOpen}
    >
      <div className={styles['nlp-mini__progress']}>
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className={`${styles['nlp-cover']} relative overflow-hidden rounded-md shrink-0`}>
        <TrackCover track={currentTrack} className="w-full h-full absolute inset-0" style={{ borderRadius: '0.375rem' }} />
      </div>
      
      <div className="flex-grow overflow-hidden">
        <h4 className="text-sm font-bold text-slate-900 truncate">{currentTrack.title}</h4>
        <p className="text-xs text-slate-600 truncate">{currentTrack.artist}</p>
      </div>
      
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button 
          onClick={actions.prev} 
          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>
        <motion.button 
          onClick={actions.togglePlay} 
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 flex items-center justify-center rounded-full text-white shadow-sm border border-white/40 transition-transform overflow-hidden relative shrink-0"
          animate={{
            background: isPlaying
              ? 'linear-gradient(135deg,#6FF5B8,#34E89E 55%,#14b878)'
              : 'linear-gradient(135deg,#FFB36B,#FF7A1A 55%,#e85d00)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span key="pause" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                <Pause size={20} fill="currentColor" />
              </motion.span>
            ) : (
              <motion.span key="play" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                <Play size={20} fill="currentColor" className="ml-0.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <button 
          onClick={actions.next} 
          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
        >
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
