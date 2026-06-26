import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Play, Pause,
  SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX,
  Sliders, ChevronDown, Activity
} from 'lucide-react';

import { useMusicStore } from './store/musicStore';
import { selectCurrentTrack } from './store/selectors';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useHotkeys } from './hooks/useHotkeys';
import { useAppContext } from '../../context/AppContext';

// Child Modular Components
import { Visualizer2D } from './components/Visualizer2D';
import { Visualizer3D } from './components/Visualizer3D';
import { EqualizerPanel } from './components/EqualizerPanel';
import { LyricsPanel } from './components/LyricsPanel';
import { ProgressBar } from './components/ProgressBar';
import { VizErrorBoundary } from './components/VizErrorBoundary';
import { VizSelect } from './components/VizSelect';
import { SoapBubbles } from './components/SoapBubbles';
import { ShuffleBubble } from './components/ShuffleBubble';
import styles from './music.module.css';

function getInitials(title: string) {
  const cleaned = title.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase() || 'NL';
}

export default function MusicPage() {
  const { closeMusic } = useAppContext();

  // Load and bootstrap audio engine callbacks
  useMusicEngine();
  useHotkeys();

  const currentTrack = useMusicStore(selectCurrentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);

  const tracks = useMusicStore((s) => s.tracks);
  const status = useMusicStore((s) => s.status);
  const volume = useMusicStore((s) => s.volume);
  const muted = useMusicStore((s) => s.muted);
  const repeat = useMusicStore((s) => s.repeat);
  const shuffle = useMusicStore((s) => s.shuffle);
  const actions = useMusicStore((s) => s.actions);
  const currentTime = useMusicStore((s) => s.currentTime); // For reactive mini progress

  // Component State
  const [searchQuery, setSearchQuery] = useState('');
  const [showEq, setShowEq] = useState(false);
  const [visualizerType, setVisualizerType] = useState<'none' | '2d-bars' | '2d-radial' | '2d-wave' | '3d-sphere' | 'lyrics'>('none');
  
  // Responsive layout state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNowPlayingOpen, setMobileNowPlayingOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;
    const query = searchQuery.toLowerCase();
    return tracks.filter(
      (t) => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  const handlePlaySong = (trackId: string) => {
    actions.playTrack(trackId, true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    actions.setVolume(value);
    if (muted && value > 0) {
      actions.setMuted(false);
    }
  };

  const formatTimeSimple = (seconds?: number) => {
    if (seconds == null || isNaN(seconds) || !isFinite(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeTrackColor = currentTrack?.coverColor || '#FF7A1A';

  // --- Reusable Components ---

  const SongList = () => (
    <div className="flex flex-col h-full bg-white/20 backdrop-blur-xl border border-white/40 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(255,122,26,0.15)]">
      {/* Search Header */}
      <div className="p-4 border-b border-white/30 bg-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs or artists..."
            className="w-full pl-9 pr-4 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl text-sm text-slate-800 placeholder-slate-500 outline-none focus:border-[#FF7A1A] focus:bg-white/60 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* List */}
      <div className={`flex-grow overflow-y-auto p-2 ${styles.scrollArea}`}>
        {status === 'loading' && (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-[#34E89E] border-t-transparent rounded-full animate-spin"></div></div>
        )}
        {status === 'idle' && filteredTracks.length === 0 && (
          <div className="text-center py-10 text-slate-600">No songs found.</div>
        )}
        
        <div className="flex flex-col gap-1">
          {filteredTracks.map((song) => {
            const isSelected = currentTrack?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => handlePlaySong(song.id)}
                className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all duration-200 ${styles['nlp-row']} ${
                  isSelected 
                    ? 'bg-white/80 shadow-[0_4px_15px_rgba(52,232,158,0.25)] border border-[#34E89E]/60 scale-[1.02] translate-x-1' 
                    : 'hover:bg-white/40 border border-transparent'
                }`}
              >
                <div className={styles['nlp-cover']}>
                  {isSelected ? <Activity size={20} className="text-[#34E89E] animate-pulse" /> : <span>{getInitials(song.title)}</span>}
                </div>
                <div className="flex-grow overflow-hidden px-1">
                  <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>{song.title}</h4>
                  <p className={`text-xs truncate ${isSelected ? 'text-slate-700' : 'text-slate-600'}`}>{song.artist}</p>
                </div>
                <div className="text-xs font-mono text-slate-500 opacity-80 pr-2">
                  {formatTimeSimple(song.durationSec)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const PlayerControls = () => (
    <div className="flex flex-col gap-4">
      {/* Visualizer & Cover Area */}
      <div className="relative aspect-square md:aspect-video w-full max-w-[400px] md:max-w-none mx-auto rounded-3xl overflow-hidden shadow-xl bg-white/20 border border-white/40 flex items-center justify-center">
        {visualizerType !== 'none' ? (
          <div className="absolute inset-0 z-0">
             <VizErrorBoundary>
                {visualizerType === '3d-sphere' && <Visualizer3D themeColor={activeTrackColor} />}
                {visualizerType === '2d-bars' && <Visualizer2D mode="bars" themeColor={activeTrackColor} />}
                {visualizerType === '2d-radial' && <Visualizer2D mode="radial" themeColor={activeTrackColor} />}
                {visualizerType === '2d-wave' && <Visualizer2D mode="wave" themeColor={activeTrackColor} />}
                {visualizerType === 'lyrics' && <LyricsPanel />}
              </VizErrorBoundary>
          </div>
        ) : (
          <div 
            className="absolute inset-0 z-0 opacity-20 blur-2xl transition-colors duration-1000"
            style={{ backgroundColor: activeTrackColor }}
          />
        )}
        
        {/* Album Cover */}
        <div 
          className={`relative z-10 w-[50%] md:w-[200px] aspect-square rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-bold text-white/90 border border-white/30 backdrop-blur-md transition-transform duration-500 ${isPlaying ? 'scale-105' : 'scale-100'} ${styles['nlp-cover']} ${styles['nlp-cover-hero']}`}
          style={{ width: '50%', height: 'auto', aspectRatio: '1/1' }}
        >
          <span>{currentTrack ? getInitials(currentTrack.title) : 'NL'}</span>
        </div>
      </div>

      {/* Info */}
      <div className="text-center mt-2">
        <h2 className="text-2xl font-bold text-slate-900 drop-shadow-sm truncate px-4">
          {currentTrack ? currentTrack.title : 'Ready to Play'}
        </h2>
        <p className="text-slate-700 font-medium truncate mt-1 px-4">
          {currentTrack ? currentTrack.artist : 'Select a song from the list'}
        </p>
      </div>

      {/* Seek */}
      <div className="px-2">
        <ProgressBar />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 bg-white/30 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-inner">
        {/* Top row: main buttons */}
        <div className="flex items-center justify-between">
          {/* Left tools */}
          <div className="flex gap-2">
            <button
              onClick={actions.toggleShuffle}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${shuffle ? 'bg-[#FF7A1A] text-white shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
            >
              <Shuffle size={20} />
            </button>
            <button
              onClick={() => {
                const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
                actions.setRepeat(modes[(modes.indexOf(repeat) + 1) % modes.length]);
              }}
              className={`w-11 h-11 relative flex items-center justify-center rounded-full transition-colors ${repeat !== 'off' ? 'bg-[#34E89E] text-slate-900 shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
            >
              <Repeat size={20} />
              {repeat === 'one' && <span className="absolute text-[9px] font-bold mt-0.5">1</span>}
            </button>
          </div>

          {/* Main Playback */}
          <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.85 }} onClick={actions.prev} className="w-12 h-12 flex items-center justify-center rounded-full text-slate-700 hover:text-[#FF7A1A] hover:bg-white/40 transition-colors">
              <SkipBack size={26} fill="currentColor" />
            </motion.button>
            <motion.button 
              onClick={actions.togglePlay} 
              whileTap={{ scale: 0.92 }}
              className="relative w-16 h-16 rounded-full flex items-center justify-center text-white overflow-hidden shrink-0"
              animate={{
                background: isPlaying
                  ? 'linear-gradient(135deg,#6FF5B8,#34E89E 55%,#14b878)'
                  : 'linear-gradient(135deg,#FFB36B,#FF7A1A 55%,#e85d00)',
                boxShadow: isPlaying
                  ? '0 6px 22px rgba(52,232,158,0.55), inset 0 1px 0 rgba(255,255,255,0.6)'
                  : '0 6px 22px rgba(255,122,26,0.55), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
            >
              <span className="pointer-events-none absolute inset-0 rounded-full"
                style={{ background:'radial-gradient(circle at 32% 22%, rgba(255,255,255,0.55), transparent 55%)' }} />
              <AnimatePresence mode="wait" initial={false}>
                {isPlaying ? (
                  <motion.span key="pause"
                    initial={{ scale: 0.4, opacity: 0, rotate: -25 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0, rotate: 25 }}
                    transition={{ duration: 0.22 }}>
                    <Pause size={28} fill="currentColor" />
                  </motion.span>
                ) : (
                  <motion.span key="play"
                    initial={{ scale: 0.4, opacity: 0, rotate: 25 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0, rotate: -25 }}
                    transition={{ duration: 0.22 }}>
                    <Play size={28} fill="currentColor" className="ml-1" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} onClick={actions.next} className="w-12 h-12 flex items-center justify-center rounded-full text-slate-700 hover:text-[#34E89E] hover:bg-white/40 transition-colors">
              <SkipForward size={26} fill="currentColor" />
            </motion.button>
          </div>

          {/* Right tools (EQ) */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowEq(!showEq)}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${showEq ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
            >
              <Sliders size={20} />
            </button>
          </div>
        </div>

        {/* Bottom row: Volume & Viz selector */}
        <div className="flex items-center justify-between gap-4 px-2 flex-wrap">
          <div className="flex items-center gap-3 flex-grow min-w-[120px] max-w-[200px]">
             <button onClick={() => actions.setMuted(!muted)} className="text-slate-600 w-8 h-8 flex items-center justify-center shrink-0">
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
             </button>
             <div className={styles['nlp-vol']}>
               <div className={styles['nlp-vol__fill']} style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
               <div className={styles['nlp-vol__bubble']} style={{ left: `${(muted ? 0 : volume) * 100}%` }} aria-hidden />
               <input
                 type="range" min="0" max="1" step="0.01"
                 value={muted ? 0 : volume}
                 onChange={handleVolumeChange}
                 className={styles['nlp-vol__input']} aria-label="Volume"
               />
             </div>
          </div>
          
          <VizSelect value={visualizerType} onChange={(v) => setVisualizerType(v as any)} />
        </div>
      </div>
      
      {/* Equalizer Panel (Collapsible) */}
      <AnimatePresence>
        {showEq && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2">
               <EqualizerPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={isMobile ? styles['nlp-mobile-root'] : ''}>
      <SoapBubbles />
      
      {/* Top Right Close Button */}
      <button 
        onClick={closeMusic}
        className="fixed top-safe right-safe mt-4 mr-20 z-[9999] w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 border border-white/50 shadow-lg transition-all"
      >
        <X size={24} />
      </button>

      {/* --- DESKTOP LAYOUT --- */}
      {!isMobile && (
        <div className="fixed inset-4 md:inset-8 z-[8500] flex gap-6">
          {/* Left: List */}
          <div className="w-[40%] max-w-[450px] min-w-[300px]">
            {SongList()}
          </div>
          
          {/* Right: Player */}
          <div className={`flex-grow flex flex-col justify-center max-w-[800px] mx-auto overflow-y-auto pr-4 ${styles['nlp-no-scrollbar']}`}>
             {PlayerControls()}
          </div>
        </div>
      )}

      {/* --- MOBILE LAYOUT --- */}
      {isMobile && (
        <div className="flex flex-col h-full z-[8500] relative pb-20">
          <div className={styles['nlp-mobile-list']}>
            <div className="p-3 h-full">
              {SongList()}
            </div>
          </div>

          {/* Floating random song ShuffleBubble above the mini player */}
          <div className="fixed right-4 z-[8650]" style={{ bottom: 'calc(5rem + 12px)' }}>
            <ShuffleBubble />
          </div>

          {/* Sticky Mini Player */}
          <div 
            className={`fixed bottom-0 left-0 right-0 h-20 flex items-center px-4 gap-3 z-[8600] active:scale-[0.98] transition-transform ${styles['nlp-mini']}`}
            onClick={() => setMobileNowPlayingOpen(true)}
          >
             {/* Mini Progress */}
             <div className={styles['nlp-mini__progress']}>
               <i style={{ width: `${(currentTime / ((currentTrack as any)?.durationSec || 1)) * 100}%` }} />
             </div>

             <div className={styles['nlp-cover']}>
                <span>{currentTrack ? getInitials(currentTrack.title) : 'NL'}</span>
             </div>
             
             <div className="flex-grow overflow-hidden">
               <h4 className="text-sm font-bold text-slate-900 truncate">{currentTrack ? currentTrack.title : 'NL Player'}</h4>
               <p className="text-xs text-slate-600 truncate">{currentTrack ? currentTrack.artist : 'Tap to open'}</p>
             </div>
             
             <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
               <button 
                  onClick={actions.prev} 
                  className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 active:scale-90 transition-transform"
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
                 <span className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ background:'radial-gradient(circle at 32% 22%, rgba(255,255,255,0.55), transparent 55%)' }} />
                 <AnimatePresence mode="wait" initial={false}>
                   {isPlaying ? (
                     <motion.span key="pause"
                       initial={{ scale: 0.4, opacity: 0, rotate: -25 }}
                       animate={{ scale: 1, opacity: 1, rotate: 0 }}
                       exit={{ scale: 0.4, opacity: 0, rotate: 25 }}
                       transition={{ duration: 0.22 }}>
                       <Pause size={20} fill="currentColor" />
                     </motion.span>
                   ) : (
                     <motion.span key="play"
                       initial={{ scale: 0.4, opacity: 0, rotate: 25 }}
                       animate={{ scale: 1, opacity: 1, rotate: 0 }}
                       exit={{ scale: 0.4, opacity: 0, rotate: -25 }}
                       transition={{ duration: 0.22 }}>
                       <Play size={20} fill="currentColor" className="ml-0.5" />
                     </motion.span>
                   )}
                 </AnimatePresence>
               </motion.button>
               <button 
                  onClick={actions.next} 
                  className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 active:scale-90 transition-transform"
               >
                 <SkipForward size={20} fill="currentColor" />
               </button>
             </div>
          </div>

          {/* Mobile Full Screen Now Playing */}
          <AnimatePresence>
            {mobileNowPlayingOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`fixed inset-0 z-[9000] bg-gradient-to-b from-[#e0f7ea] to-[#fff3e0] flex flex-col pt-safe px-6 pb-6 overflow-y-auto ${styles['nlp-no-scrollbar']}`}
              >
                <div className="flex justify-between items-center mb-6 pt-4">
                  <button onClick={() => setMobileNowPlayingOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white/40 rounded-full text-slate-800 shadow-sm active:scale-90 transition-transform">
                    <ChevronDown size={28} />
                  </button>
                  <span className="font-bold text-slate-800 uppercase tracking-widest text-xs">Now Playing</span>
                  <div className="w-12"></div>
                </div>
                
                <div className="flex-grow flex flex-col justify-center min-h-0">
                  {PlayerControls()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}

