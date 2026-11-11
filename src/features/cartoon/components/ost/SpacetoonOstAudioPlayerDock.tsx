import React, { useRef, useState, useEffect } from 'react';
import {
  Headphones,
  Video,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  X,
  Disc3,
} from 'lucide-react';
import type { SpacetoonOstTrack } from './SpacetoonThemeSongCard';
import { GlassVectorIcon } from '../../../../components/shared/icons';

export interface SpacetoonOstAudioPlayerDockProps {
  track: SpacetoonOstTrack | null;
  mode: 'audio' | 'video';
  onModeChange: (next: 'audio' | 'video') => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const SpacetoonOstAudioPlayerDock: React.FC<SpacetoonOstAudioPlayerDockProps> = ({
  track,
  mode,
  onModeChange,
  onPrev,
  onNext,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!track || mode !== 'audio') return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.audioStreamUrl;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [track, mode]);

  if (!track) return null;

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="my-6 rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-white/25 p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <GlassVectorIcon icon={Disc3} theme="emerald" size={20} active />
          <div>
            <h3 className="text-base font-black text-white">{track.titleAr}</h3>
            <p className="text-xs text-teal-300 font-bold">
              {track.vocalistAr} · {track.seriesTitleAr}
            </p>
          </div>
        </div>

        {/* Mode Switcher: Audio-Only vs Video Opening */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-2xl bg-white/10 border border-white/20 p-1">
            <button
              type="button"
              onClick={() => onModeChange('audio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition ${
                mode === 'audio'
                  ? 'bg-teal-400 text-slate-950 shadow'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Headphones size={14} />
              <span>وضع الصوت فقط (Audio)</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition ${
                mode === 'video'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Video size={14} />
              <span>وضع فيديو الشارة (Video)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-rose-500/80 text-white border border-white/20 cursor-pointer transition"
            aria-label="إغلاق المشغل"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {mode === 'audio' ? (
        <div className="pt-5 flex flex-col md:flex-row items-center gap-6">
          <audio
            ref={audioRef}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={onNext}
            controls
            className="hidden"
          />

          {/* Spinning Poster Artwork Vinyl */}
          <div className="relative w-36 h-36 rounded-3xl overflow-hidden border-2 border-teal-300/60 shadow-2xl shrink-0">
            <img
              src={track.posterUrl}
              alt={track.titleAr}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 flex flex-col items-center md:items-start gap-4 w-full">
            <div className="text-center md:text-right">
              <span className="text-xs font-bold text-teal-300">{track.planetLabelAr}</span>
              <h4 className="text-lg font-black text-white mt-0.5">{track.titleAr}</h4>
              <p className="text-xs text-slate-300 mt-1">
                غناء وألحان: {track.vocalistAr} — تسجيلات مركز الزهرة الأصلي
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPrev}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer"
                title="الشارة السابقة"
              >
                <SkipForward size={16} />
              </button>

              <button
                type="button"
                onClick={toggleAudio}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'إيقاف مؤقت' : 'تشغيل الشارة صوتياً'}</span>
              </button>

              <button
                type="button"
                onClick={onNext}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer"
                title="الشارة التالية"
              >
                <SkipBack size={16} />
              </button>

              <a
                href={track.audioStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>تحميل MP3</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl">
            <iframe
              src={track.videoEmbedUrl}
              title={track.titleAr}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
