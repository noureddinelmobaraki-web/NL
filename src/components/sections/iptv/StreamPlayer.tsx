import { useState, useEffect } from 'react';
import { 
  Pause, 
  Play, 
  VolumeX, 
  Volume2, 
  Maximize2 
} from 'lucide-react';
import { StreamErrorType } from './types';
import { useDeviceType } from '../../../hooks/useDeviceType';

interface StreamPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isBuffering: boolean;
  error: string | null;
  streamName?: string;
  category: 'radio' | 'music_channels' | 'music_audio';
  qualities?: { quality: string; url: string }[];
  currentQualityIndex?: number;
  onToggleMute: () => void;
  onTogglePlayback: () => void;
  onVolumeChange: (v: number) => void;
  onStop: () => void;
  onFullscreen: () => void;
  onQualityChange?: (index: number) => void;
  onRetry?: () => void;
  onNextStream?: () => void;
  theme: string;
}

function getErrorDisplay(errType: StreamErrorType, streamName: string): {
  icon: string;
  title: string;
  subtitle: string;
  canRetry: boolean;
} {
  switch (errType) {
    case 'CORS_BLOCKED':
      return {
        icon: '🔒',
        title: 'البث محجوب بسياسة المتصفح (CORS)',
        subtitle: 'القناة تشتغل لكن المتصفح يمنع الوصول. جرب مشغّل خارجي.',
        canRetry: false
      };
    case 'NETWORK_OFFLINE':
      return {
        icon: '📵',
        title: 'لا يوجد اتصال بالإنترنت',
        subtitle: 'تحقق من شبكتك وأعد المحاولة.',
        canRetry: true
      };
    case 'TIMEOUT':
      return {
        icon: '⏱️',
        title: 'انتهت مهلة الاتصال (15 ثانية)',
        subtitle: 'البث بطيء جداً أو غير متاح الآن.',
        canRetry: true
      };
    case 'MEDIA_DECODE':
      return {
        icon: '🎞️',
        title: 'تنسيق غير مدعوم في هذا المتصفح',
        subtitle: 'جرب Chrome أو Firefox للحصول على دعم أفضل.',
        canRetry: false
      };
    case 'STREAM_DEAD':
      return {
        icon: '📡',
        title: 'البث منقطع أو خارج الهواء',
        subtitle: `${streamName} — انتقال تلقائي للقناة التالية...`,
        canRetry: true
      };
    default:
      return {
        icon: '📡',
        title: 'لا توجد إشارة',
        subtitle: 'انقطع البث أو الرابط غير متاح.',
        canRetry: true
      };
  }
}

export function StreamPlayer({
  videoRef,
  isPlaying,
  isMuted,
  volume,
  isBuffering,
  error,
  streamName = '',
  category,
  qualities = [],
  currentQualityIndex = 0,
  onToggleMute,
  onTogglePlayback,
  onVolumeChange,
  onFullscreen,
  onQualityChange,
  onRetry,
  onNextStream,
  theme
}: StreamPlayerProps) {
  const { isMobile } = useDeviceType();
  const [copySuccess, setCopySuccess] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && category === 'radio') {
      const startTime = Date.now() - (elapsedSeconds * 1000);
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!isPlaying) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, category]);

  useEffect(() => {
    setElapsedSeconds(0);
  }, [streamName]);

  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const THEME_SKIN = {
    light: {
      scanlines: true,
      statusScreen: 'bg-black text-[#00FF00]',
    },
    dark: {
      scanlines: true,
      statusScreen: 'bg-black text-[#B8FF3F]',
    },
    bit: {
      scanlines: true,
      statusScreen: 'bg-[#120b25] text-[#00ffff]',
    },
    midnight: {
      scanlines: false,
      statusScreen: 'bg-[#040a12] text-[#60a5fa]',
    }
  };

  const skin = THEME_SKIN[theme as keyof typeof THEME_SKIN] || THEME_SKIN.light;

  const handleCopyLink = () => {
    const activeQual = qualities[currentQualityIndex];
    if (activeQual) {
      try {
        navigator.clipboard.writeText(activeQual.url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const classifiedError: StreamErrorType = (error === 'CORS_BLOCKED') 
    ? 'CORS_BLOCKED' 
    : (error?.includes('offline') ? 'NETWORK_OFFLINE' : 'UNKNOWN');

  return (
    <div className={`flex flex-col bg-black relative min-w-0 ${isMobile ? 'w-full h-auto' : 'flex-1'}`}>
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950 h-56 md:h-auto">
        {/* Standard Video Player */}
        <video
          ref={videoRef}
          muted={isMuted}
          playsInline
          autoPlay
          className="w-full h-full object-contain"
          style={{
            display: category === 'music_channels' ? 'block' : 'none',
            filter: 'none'
          }}
        />

        {/* Premium cassette graphics for non-video categories */}
        {(category === 'radio' || category === 'music_audio') && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${
            theme === 'dark' ? 'bg-[#050505]' : 
            theme === 'bit' ? 'bg-[#120b25]' : 
            theme === 'midnight' ? 'bg-[#040a12]' : 'bg-zinc-950'
          }`}>
            {skin.scanlines && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-[length:100%_4px] pointer-events-none z-10 animate-pulse" />
            )}
            
            <div 
              className={`rounded-xl p-4 w-72 h-44 flex flex-col justify-between shadow-2xl relative ${
                theme === 'dark' ? 'bg-[#121212] border-2 border-[#1f1f1f]' : 
                theme === 'bit' ? 'bg-[#1a1032] border-3 border-[#ff00ff]' : 
                theme === 'midnight' ? 'bg-[#101f30] border border-[#1e3a5f]' : 'bg-zinc-900 border-4 border-zinc-800'
              }`}
              style={{
                boxShadow: theme === 'bit' ? '0 0 0 2.5px #00ffff' : 'none'
              }}
            >
              <div className={`h-10 rounded-lg flex items-center justify-between px-3 text-[10px] font-mono font-bold border shadow-inner ${
                theme === 'dark' ? 'bg-[#050505] text-[#B8FF3F] border-[#1f1f1f]' : 
                theme === 'bit' ? 'bg-[#2d1b69] text-[#00ffff] border-[#00ffff] uppercase' : 
                theme === 'midnight' ? 'bg-[#0c1929] text-[#60a5fa] border-[#1e3a5f]' : 'bg-gradient-to-r from-yellow-500 to-orange-400 text-zinc-950 border-zinc-950'
              }`}>
                <div className="truncate pr-2">
                  {category === 'radio' ? '📻' : '🎵'} {streamName || (category === 'radio' ? 'Radio' : 'Music Link')}
                </div>
                <div className="flex-shrink-0">
                  {elapsedSeconds > 0 ? (
                    <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${
                      theme === 'dark' ? 'text-[#B8FF3F]' : 
                      theme === 'bit' ? 'text-[#00ffff]' : 
                      theme === 'midnight' ? 'text-[#60a5fa]' : 'text-emerald-950 font-bold'
                    }`}>
                      🎙 {formatElapsed(elapsedSeconds)}
                    </span>
                  ) : (
                    <span className={`animate-pulse px-1.5 py-0.5 rounded text-[8px] tracking-wide ${
                      theme === 'dark' ? 'bg-[#B8FF3F]/20 text-[#B8FF3F]' : 
                      theme === 'bit' ? 'bg-[#ff00ff] text-white' : 
                      theme === 'midnight' ? 'bg-[#3b82f6]/20 text-[#60a5fa]' : 'bg-emerald-700 text-white'
                    }`}>
                      {theme === 'bit' ? 'LIVE' : 'ONLINE'}
                    </span>
                  )}
                </div>
              </div>

              {/* Tape reels */}
              <div className="flex justify-around items-center py-2 relative z-10">
                <div className="relative">
                  <div 
                    className={`w-14 h-14 rounded-full border-4 border-dashed flex items-center justify-center ${
                      theme === 'dark' ? 'border-[#333] bg-[#050505]' : 
                      theme === 'bit' ? 'border-[#ff00ff] bg-[#120b25]' : 
                      theme === 'midnight' ? 'border-[#1e3a5f] bg-[#080f1a]' : 'border-zinc-400 bg-zinc-950'
                    } ${
                      isPlaying ? 'animate-spin' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : theme === 'bit' ? 'bg-[#ff00ff]' : theme === 'midnight' ? 'bg-[#1e3a5f]' : 'bg-zinc-200'}`} />
                  </div>
                </div>

                <div className={`w-16 h-8 border-2 rounded flex items-center justify-around px-1 overflow-hidden ${
                  theme === 'dark' ? 'border-[#1f1f1f] bg-[#050505]' : 
                  theme === 'bit' ? 'border-[#ff00ff] bg-[#120b25]' : 
                  theme === 'midnight' ? 'border-[#1e3a5f] bg-[#080f1a]' : 'border-zinc-800 bg-zinc-950'
                }`}>
                  <div className={`w-0.5 h-6 rounded transition-transform ${theme === 'bit' ? 'bg-[#00ffff]' : 'bg-red-600'} ${isPlaying ? 'scale-y-125' : 'scale-y-50'}`} />
                  <div className={`w-0.5 h-6 rounded transition-transform ${theme === 'bit' ? 'bg-[#00ffff]' : 'bg-red-600'} ${isPlaying ? 'scale-y-75' : 'scale-y-50'}`} />
                </div>

                <div className="relative">
                  <div 
                    className={`w-14 h-14 rounded-full border-4 border-dashed flex items-center justify-center ${
                      theme === 'dark' ? 'border-[#333] bg-[#050505]' : 
                      theme === 'bit' ? 'border-[#ff00ff] bg-[#120b25]' : 
                      theme === 'midnight' ? 'border-[#1e3a5f] bg-[#080f1a]' : 'border-zinc-400 bg-zinc-950'
                    } ${
                      isPlaying ? 'animate-spin' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : theme === 'bit' ? 'bg-[#ff00ff]' : theme === 'midnight' ? 'bg-[#1e3a5f]' : 'bg-zinc-200'}`} />
                  </div>
                </div>
              </div>

              {/* Equilisers */}
              <div className="flex justify-between items-end h-5 px-4 gap-0.5">
                {[4, 8, 2, 7, 5, 10, 3, 9, 6, 8, 2, 5, 7, 4, 9, 3].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: isPlaying ? `${Math.floor(Math.random() * 100)}%` : `${height * 10}%`,
                      backgroundColor: theme === 'dark' ? '#B8FF3F' : 
                                       theme === 'bit' ? (i % 2 === 0 ? '#ff00ff' : '#00ffff') : 
                                       theme === 'midnight' ? '#60a5fa' : 
                                       (i % 2 === 0 ? '#10B981' : '#F59E0B')
                    }}
                  />
                ))}
              </div>
            </div>

            <div className={`text-[10px] font-mono mt-3 uppercase tracking-widest text-center ${
              theme === 'dark' ? 'text-[#B8FF3F]' : 
              theme === 'bit' ? 'text-[#ff00ff]' : 
              theme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-400'
            }`}>
              {isPlaying ? (
                category === 'radio' 
                  ? (theme === 'bit' ? 'PLAYING RADIO-BROADCAST' : 'Playing Radio • البث الإذاعي قيد التشغيل')
                  : (theme === 'bit' ? 'PLAYING MUSIC-TRACK' : 'Playing Music • البث الموسيقي قيد التشغيل')
              ) : (
                category === 'radio'
                  ? (theme === 'bit' ? 'RADIO TUNED' : 'Radio Tuned • الراديو جاهز')
                  : (theme === 'bit' ? 'DECK LOADED' : 'Deck Loaded • الموسيقى جاهزة')
              )}
            </div>
          </div>
        )}

        {/* Scanlines overlay */}
        {category !== 'music_channels' && (
          <div 
            className="absolute inset-0 pointer-events-none select-none z-20"
            style={{
              backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%)',
              backgroundSize: '100% 4px',
              backgroundColor: skin.scanlines && theme === 'dark' ? 'rgba(184,255,63,0.03)' : 
                               skin.scanlines && theme === 'bit' ? 'rgba(255,0,255,0.03)' : 'transparent'
            }}
          />
        )}

        {/* State Indicators */}
        {!isBuffering && !error && (
          <div className="absolute top-2.5 left-2.5 bg-red-700 text-white font-mono text-[9px] px-2 py-0.5 font-bold border border-red-900 shadow-md tracking-wider flex items-center gap-1 z-30">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>🔴 ON AIR</span>
          </div>
        )}

        {isBuffering && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10">
            <div className="absolute inset-0 bg-zinc-950/40 repeating-linear-gradient opacity-60 animate-pulse" />
            <div className="z-10 text-center text-white font-mono flex flex-col items-center gap-3">
              <div className="text-4xl animate-spin">⏳</div>
              <div className="text-xs tracking-wider">جاري ضبط الإشارة والتوصيل...</div>
              <div className="text-[10px] text-zinc-400 max-w-[200px] truncate">{streamName}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10 p-4 border-2 border-red-800">
            <div className="text-center text-white font-mono flex flex-col items-center gap-2">
              <span className="text-4xl">{getErrorDisplay(classifiedError, streamName).icon}</span>
              <div className="text-xs text-red-500 font-bold">{getErrorDisplay(classifiedError, streamName).title}</div>
              <p className="text-[10px] text-zinc-400 max-w-xs">{getErrorDisplay(classifiedError, streamName).subtitle}</p>
              
              <div className="flex gap-2 mt-3 flex-wrap justify-center">
                {getErrorDisplay(classifiedError, streamName).canRetry && onRetry && (
                  <button 
                    type="button"
                    onClick={onRetry}
                    className="bg-zinc-800 text-[10px] hover:bg-zinc-700 text-white font-mono px-3 py-1 border border-zinc-600 rounded shadow cursor-pointer transition-colors"
                  >
                    إعادة المحاولة (Retry)
                  </button>
                )}
                
                {classifiedError === 'CORS_BLOCKED' && (
                  <button 
                    type="button"
                    onClick={handleCopyLink}
                    className={`text-[10px] font-mono px-3 py-1 border rounded shadow cursor-pointer transition-colors ${
                      copySuccess 
                        ? 'bg-emerald-800 border-emerald-600 text-white' 
                        : 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white font-sans'
                    }`}
                  >
                    {copySuccess ? '✔️ تم النسخ!' : '📋 نسخ الرابط للمشغّل الخارجي'}
                  </button>
                )}

                {onNextStream && (
                  <button 
                    type="button"
                    onClick={onNextStream}
                    className="bg-zinc-800 text-[10px] hover:bg-zinc-700 text-white font-mono px-3 py-1 border border-zinc-600 rounded shadow cursor-pointer transition-colors font-sans"
                  >
                    القناة التالية ➡️
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control sliders */}
      <div 
        className={`py-1.5 px-3 flex items-center gap-3 flex-shrink-0 z-30 font-mono text-xs border-t ${
          isMobile ? 'flex-nowrap overflow-x-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'flex-wrap'
        } ${
          theme === 'dark' ? 'bg-[#0d0d0d] text-zinc-400 border-[#1f1f1f]' : 
          theme === 'bit' ? 'bg-[#2d1b69] text-[#ff00ff] border-[#ff00ff] uppercase' : 
          theme === 'midnight' ? 'bg-[#0c1929] text-[#94a3b8] border-[#1e3a5f]' : 'bg-[#C0C0C0] text-zinc-950 border-zinc-400'
        }`}
      >
        <button 
          type="button"
          onClick={onTogglePlayback}
          style={isMobile ? { minWidth: '44px', minHeight: '44px' } : (theme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {})}
          className={`px-2 py-1 rounded flex items-center justify-center border transition-all ${isMobile ? 'text-xs' : 'text-[10px]'} ${
            theme === 'dark' ? 'bg-[#151515] hover:bg-[#222] border-[#333] text-[#B8FF3F]' : 
            theme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 border-[#00ffff] text-[#00ffff]' : 
            theme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
            'bg-zinc-300 hover:bg-zinc-400 active:bg-zinc-500 border-zinc-400 text-zinc-950'
          }`}
        >
          {isPlaying ? <Pause className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} /> : <Play className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />}
        </button>

        <button 
          type="button"
          onClick={onToggleMute}
          style={isMobile ? { minWidth: '44px', minHeight: '44px' } : (theme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {})}
          className={`px-2 py-1 rounded flex items-center justify-center gap-1 border transition-all ${isMobile ? 'text-xs' : 'text-[10px]'} ${
            theme === 'dark' ? 'bg-[#151515] hover:bg-[#222] border-[#333] text-[#B8FF3F]' : 
            theme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 border-[#00ffff] text-[#00ffff]' : 
            theme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
            'bg-zinc-300 hover:bg-zinc-400 active:bg-zinc-500 border-zinc-400 text-zinc-950'
          }`}
        >
          {isMuted ? <VolumeX className={`${isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} ${theme === 'bit' ? 'text-[#ff00ff]' : 'text-red-700'}`} /> : <Volume2 className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />}
        </button>

        {/* Volume */}
        <div className="flex items-center gap-1.5 min-w-[100px] max-w-[140px] flex-1">
          <span className={`font-bold ${isMobile ? 'text-xs' : 'text-[10px]'} ${
            theme === 'dark' ? 'text-[#B8FF3F]' : 
            theme === 'bit' ? 'text-[#ff00ff]' : 
            theme === 'midnight' ? 'text-[#60a5fa]' : 'opacity-70'
          }`}>VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className={`w-full cursor-pointer h-2 bg-zinc-400 outline-none rounded-lg appearance-none accent-blue-900 ${
              theme === 'dark' ? 'accent-[#B8FF3F] bg-zinc-800' : 
              theme === 'bit' ? 'accent-[#ff00ff] bg-[#120b25]' : 
              theme === 'midnight' ? 'accent-[#3b82f6] bg-[#080f1a]' : ''
            }`}
          />
        </div>

        {/* Qualities backup support */}
        {qualities.length > 1 && onQualityChange && (
          <button
            type="button"
            onClick={() => {
              const nextQ = (currentQualityIndex + 1) % qualities.length;
              onQualityChange(nextQ);
            }}
            style={isMobile ? { minWidth: '44px', minHeight: '44px' } : (theme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {})}
            className={`font-bold border px-2.5 py-1 rounded transition-all ${isMobile ? 'text-xs' : 'text-[10px]'} ${
              theme === 'dark' ? 'bg-[#222] hover:bg-[#333] border-[#333] text-[#B8FF3F]' : 
              theme === 'bit' ? 'bg-[#ff00ff]/20 hover:bg-[#ff00ff]/40 border-[#ff00ff] text-[#ffff00]' : 
              theme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
              'bg-blue-800 hover:bg-blue-950 text-white border-blue-900'
            }`}
          >
            ⚙️ {qualities[currentQualityIndex].quality}
          </button>
        )}

        {/* Readout screen */}
        <div className={`flex-1 text-center truncate px-2 font-mono h-8 md:h-6 flex items-center justify-center border rounded ${isMobile ? 'text-xs' : 'text-[10px]'} ${
          theme === 'dark' ? 'bg-black text-[#B8FF3F] border-[#1f1f1f]' : 
          theme === 'bit' ? 'bg-[#120b25] text-[#ffff00] border-[#00ffff]' : 
          theme === 'midnight' ? 'bg-[#040a12] text-[#60a5fa] border-[#1e3a5f]' : 
          'bg-black text-[#00FF00] border-zinc-400'
        }`}>
          {streamName ? (
            category === 'radio' && elapsedSeconds > 0 ? (
              `${theme === 'bit' ? streamName.toUpperCase() : streamName} — ${formatElapsed(elapsedSeconds)}`
            ) : (
              theme === 'bit' ? streamName.toUpperCase() : streamName
            )
          ) : 'NO_STREAM'}
        </div>

        <button 
          type="button"
          onClick={onFullscreen}
          style={isMobile ? { minWidth: '44px', minHeight: '44px' } : (theme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {})}
          className={`px-2 py-1 rounded flex items-center justify-center border transition-all ${isMobile ? 'text-xs' : 'text-[10px]'} ${
            theme === 'dark' ? 'bg-[#151515] hover:bg-[#222] border-[#333] text-[#B8FF3F]' : 
            theme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 border-[#00ffff] text-[#00ffff]' : 
            theme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
            'bg-zinc-300 hover:bg-zinc-400 active:bg-zinc-500 border border-zinc-400 text-zinc-950'
          }`}
          title="Fullscreen"
        >
          <Maximize2 className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
        </button>
      </div>
    </div>
  );
}
