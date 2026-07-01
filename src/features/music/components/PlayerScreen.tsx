import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicStore } from '../store/musicStore';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { LyricsPanel } from './LyricsPanel';
import { NowPlayingMenu } from './NowPlayingMenu';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Heart, Download, Mic2, Volume2, VolumeX, ChevronDown, Loader2, CheckCircle2,
  MoreHorizontal
} from 'lucide-react';

const pressSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;
const iconSpring  = { type: 'spring', stiffness: 400, damping: 26 } as const;
const hoverScale  = { scale: 1.06 };
const tapScale    = { scale: 0.9 };
const ringInit    = { scale: 0.85, opacity: 0.55 };
const ringAnim    = { scale: 1.35, opacity: 0 };
const ringTrans   = { duration: 1.6, repeat: Infinity, ease: 'easeOut' } as const;
const inFromRight = { scale: 0, rotate: 90, opacity: 0 };
const inFromLeft  = { scale: 0, rotate: -90, opacity: 0 };
const centered    = { scale: 1, rotate: 0, opacity: 1 };

function fmt(sec: number): string {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function PlayerScreen({ onClose }: { onClose?: () => void }) {
  const { currentTrack, currentTime, duration, seek } = useNowPlaying();
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const volume = useMusicStore((s) => s.volume);
  const muted = useMusicStore((s) => s.muted);
  const repeat = useMusicStore((s) => s.repeat);
  const shuffle = useMusicStore((s) => s.shuffle);
  const favorites = useMusicStore(useShallow((s) => s.favorites));
  const actions = useMusicStore((s) => s.actions);

  const [showLyrics, setShowLyrics] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dl, setDl] = useState<'idle' | 'start' | 'done' | 'error'>('idle');
  const downloaded = useMusicStore((s) => s.downloaded);
  const isSaved = !!currentTrack && downloaded.includes(currentTrack.id);

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full text-white/40 text-sm">
        No song playing
      </div>
    );
  }

  const isFav = favorites.includes(currentTrack.id);
  const cover = currentTrack.coverUrl;
  const fallbackStyle = { backgroundColor: (currentTrack as any).coverColor || '#FF7A1A' };

  return (
    <div className="relative flex flex-col h-[100dvh] w-full overflow-hidden text-slate-800">
      <AnimatePresence>
        {menuOpen && (
          <NowPlayingMenu track={currentTrack} onClose={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>

      {/* رأس: إغلاق */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        {onClose ? (
          <button onClick={onClose} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors drop-shadow-sm">
            <ChevronDown size={28} className="drop-shadow-sm" />
          </button>
        ) : <span />}
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 drop-shadow-sm">Now Playing</span>
        <button 
          onClick={() => setMenuOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 transition-colors drop-shadow-sm"
          title="خيارات التشغيل"
        >
          <MoreHorizontal size={24} className="drop-shadow-sm" />
        </button>
      </div>

      {/* الكوفر (مربع) — تعتيم بالإضاءة فقط */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-4">
        <div className="relative aspect-square w-[min(68vw,36vh,280px)] max-w-full mx-auto rounded-[2rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/60">
          {cover ? (
            <img
              src={cover}
              alt={currentTrack.title}
              className={
                'w-full h-full object-cover transition-[filter] duration-[1500ms] ease-in-out ' +
                (showLyrics ? 'brightness-[0.35]' : 'brightness-100')
              }
            />
          ) : (
            <div
              className={
                'w-full h-full transition-[filter] duration-[1500ms] ease-in-out ' +
                (showLyrics ? 'brightness-[0.35]' : 'brightness-100')
              }
              style={fallbackStyle}
            />
          )}
          {/* الكلمات فوق الكوفر (شفافة تماماً، بلا blur ولا طبقة لون) */}
          {showLyrics && (
            <div className="absolute inset-0 z-10">
              <LyricsPanel />
            </div>
          )}
        </div>
      </div>

      {/* العنوان ثم الفنان */}
      <div className="px-6 text-center shrink-0 mt-5">
        <h2 className="text-xl font-extrabold truncate text-slate-900 drop-shadow-sm">{currentTrack.title}</h2>
        <p className="text-sm font-medium text-slate-600 truncate mt-1 drop-shadow-sm">{currentTrack.artist}</p>
      </div>

      {/* صف الإجراءات الثانوية: قلب / كلمات / تحميل (تحت العنوان) */}
      <div className="flex items-center justify-center gap-6 mt-4 shrink-0">
        <button
          onClick={() => actions.toggleFavorite(currentTrack.id)}
          className={`transition-all hover:scale-110 drop-shadow-md ${isFav ? 'text-rose-500' : 'text-slate-700 hover:text-slate-900'}`}
        >
          <Heart size={24} fill={isFav ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => setShowLyrics((v) => !v)}
          className={
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border ' +
            (showLyrics 
              ? 'bg-gradient-to-r from-[#FF7A1A] to-[#00E676] text-white border-transparent shadow-[0_4px_12px_rgba(0,230,118,0.4)]' 
              : 'bg-white/40 text-slate-700 hover:bg-white/60 border-white/50 shadow-sm backdrop-blur-md')
          }
        >
          <Mic2 size={18} className={showLyrics ? 'drop-shadow-md' : ''} /> Lyrics
        </button>
        <button
          onClick={() => {
            if (!currentTrack) return;
            if (isSaved) { actions.removeOffline(currentTrack); return; }
            setDl('start');
            actions.saveOffline(currentTrack).finally(() => setDl('idle'));
          }}
          disabled={dl === 'start'}
          title={isSaved ? 'Saved offline — tap to remove' : 'Save offline'}
          aria-label="Save offline"
          className={`transition-all hover:scale-110 drop-shadow-md disabled:opacity-50 ${isSaved ? 'text-[#00E676]' : 'text-slate-700 hover:text-[#FF7A1A]'}`}
        >
          {dl === 'start'
            ? <Loader2 size={22} className="animate-spin" />
            : isSaved ? <CheckCircle2 size={22} /> : <Download size={22} />}
        </button>
      </div>

      {/* شريط التقدم */}
      <div className="px-8 mt-5 shrink-0">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full h-1.5 glassSlider"
          style={{
            background: `linear-gradient(to right, #FF7A1A 0%, #00E676 ${(currentTime / (duration || 1)) * 100}%, rgba(255,122,26,0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(0,230,118,0.2) 100%)`
          }}
        />
        <div className="flex justify-between text-[11px] font-medium font-mono text-slate-500 mt-2">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* أزرار التحكم الرئيسية */}
      <div className="flex items-center justify-center gap-7 mt-4 shrink-0">
        <button
          onClick={() => actions.toggleShuffle()}
          className={`transition-all hover:scale-110 drop-shadow-sm ${shuffle ? 'text-[#FF7A1A]' : 'text-slate-700 hover:text-slate-900'}`}
        >
          <Shuffle size={22} />
        </button>
        <button onClick={() => actions.prev()} className="text-slate-700 hover:text-slate-900 hover:scale-110 transition-all drop-shadow-md active:scale-95">
          <SkipBack size={32} fill="currentColor" />
        </button>
        
        {/* Play/Pause — animated, professional */}
        <motion.button
          onClick={() => actions.togglePlay()}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          whileHover={hoverScale}
          whileTap={tapScale}
          transition={pressSpring}
          className="relative w-20 h-20 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[#FF7A1A] to-[#00E676] border border-white/60 shadow-[0_8px_32px_rgba(255,122,26,0.45)] overflow-hidden"
        >
          {/* soft pulsing ring while playing */}
          <AnimatePresence>
            {isPlaying && (
              <motion.span
                key="ring"
                className="absolute inset-0 rounded-full border-2 border-white/50"
                initial={ringInit}
                animate={ringAnim}
                exit={ringInit}
                transition={ringTrans}
              />
            )}
          </AnimatePresence>

          {/* morphing icon */}
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span
                key="pause"
                className="absolute flex items-center justify-center"
                initial={inFromLeft}
                animate={centered}
                exit={inFromRight}
                transition={iconSpring}
              >
                <Pause size={34} fill="currentColor" className="drop-shadow-lg" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                className="absolute flex items-center justify-center"
                initial={inFromRight}
                animate={centered}
                exit={inFromLeft}
                transition={iconSpring}
              >
                <Play size={34} fill="currentColor" className="ml-1 drop-shadow-lg" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <button onClick={() => actions.next()} className="text-slate-700 hover:text-slate-900 hover:scale-110 transition-all drop-shadow-md active:scale-95">
          <SkipForward size={32} fill="currentColor" />
        </button>
        <button
          onClick={() => actions.setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
          className={`transition-all hover:scale-110 drop-shadow-sm ${repeat !== 'off' ? 'text-[#00E676]' : 'text-slate-700 hover:text-slate-900'}`}
        >
          {repeat === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
        </button>
      </div>

      {/* الصوت */}
      <div className="flex items-center gap-4 px-8 mt-5 mb-6 shrink-0">
        <button onClick={() => actions.setMuted(!muted)} className="text-slate-700 hover:text-slate-900 transition-colors drop-shadow-sm">
          {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => actions.setVolume(Number(e.target.value))}
          className="flex-1 h-1.5 glassSlider"
          style={{
            background: `linear-gradient(to right, #FF7A1A 0%, #00E676 ${(muted ? 0 : volume) * 100}%, rgba(255,122,26,0.2) ${(muted ? 0 : volume) * 100}%, rgba(0,230,118,0.2) 100%)`
          }}
        />
      </div>
    </div>
  );
}
