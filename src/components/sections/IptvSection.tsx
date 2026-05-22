import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { STREAM_SOURCES } from '../../config/streams';
import { 
  Tv, 
  Radio, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Play, 
  Pause, 
  X, 
  RotateCcw,
  SortAsc
} from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType';
import { OsWindow } from '../OsWindow';
import { audioManager } from '../../audio/audioManager';

// Custom Type declarations
interface StreamItem {
  id: string;
  name: string;
  category: 'radio' | 'music_channels' | 'music_audio';
  group: string; // Dynamic Group / Country / Genre
  logo: string;
  url: string;
  qualities: { quality: string; url: string }[];
  currentQualityIndex: number;
  failCount?: number;    // how many health checks failed
  lastSeen?: number;     // timestamp of last successful playback
  hidden?: boolean;      // soft-hidden, not deleted
}

// Default high-quality fallback streams for clean initialization
const DEFAULT_PRESET_STREAMS: StreamItem[] = [
  {
    id: 'pr_aloula',
    name: 'Al Aoula HD',
    category: 'music_channels',
    group: 'Morocco',
    logo: 'https://i.imgur.com/Ki3ySUE.png',
    url: 'https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8',
    qualities: [{ quality: 'Auto', url: 'https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8' }],
    currentQualityIndex: 0
  },
  {
    id: 'pr_medi1_radio',
    name: 'Medi 1 Radio',
    category: 'radio',
    group: 'Morocco',
    logo: 'https://i.imgur.com/3YsZPY6.jpeg',
    url: 'https://medi1.ice.infomaniak.ch/medi1-128.mp3',
    qualities: [{ quality: 'HQ', url: 'https://medi1.ice.infomaniak.ch/medi1-128.mp3' }],
    currentQualityIndex: 0
  }
];

// Helper to sanitize and normalize text for fuzzy search
function normalizeFuzzy(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic accents
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // keep words and numbers
    .replace(/\s+/g, ' ')
    .trim();
}

function getLevenDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function dynamicFuzzyMatch(name: string, query: string): boolean {
  const normName = normalizeFuzzy(name);
  const normQuery = normalizeFuzzy(query);

  if (!normQuery) return true;
  if (normName.includes(normQuery)) return true;

  const nameWords = normName.split(' ');
  const queryWords = normQuery.split(' ');

  return queryWords.every((qw) => {
    return nameWords.some((nw) => {
      if (nw.includes(qw) || qw.includes(nw)) return true;
      const dist = getLevenDistance(nw, qw);
      const tolerance = qw.length > 5 ? 2 : qw.length >= 3 ? 1 : 0;
      return dist <= tolerance;
    });
  });
}

type StreamErrorType =
  | 'CORS_BLOCKED'
  | 'NETWORK_OFFLINE'
  | 'STREAM_DEAD'
  | 'TIMEOUT'
  | 'MEDIA_DECODE'
  | 'UNKNOWN';

function classifyStreamError(
  error: unknown,
  hlsErrorType?: string
): StreamErrorType {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    // "Failed to fetch" in Chrome/Firefox = CORS or Network
    // We can't distinguish purely from the error, but:
    // If navigator.onLine === false → NETWORK_OFFLINE
    if (!navigator.onLine) return 'NETWORK_OFFLINE';
    // Otherwise "Failed to fetch" almost always means CORS
    // when the request was made to a streaming CDN
    if (msg.includes('failed to fetch') ||
        msg.includes('network error') ||
        msg.includes('load failed')) {
      return 'CORS_BLOCKED';
    }
  }
  if (hlsErrorType === 'NETWORK_CORS_TIMEOUT') return 'CORS_BLOCKED';
  if (hlsErrorType === 'PROBE_TIMEOUT_5S') return 'TIMEOUT';
  if (hlsErrorType === 'MEDIA_FILE_INVALID') return 'MEDIA_DECODE';
  if (hlsErrorType === 'STREAM_DEFEATED') return 'STREAM_DEAD';
  return 'UNKNOWN';
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
        title: 'انتهت مهلة الاتصال (5 ثوان)',
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

interface Channel {
  group: string;
  name: string;
  logo: string;
  country?: string;
  url: string;
}

function parseM3U(raw: string): Channel[] {
  const lines = raw.split('\n');
  const channels: Channel[] = [];
  let current: Partial<Channel> = {};

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const groupMatch  = line.match(/group-title="([^"]+)"/);
      const nameMatch   = line.match(/,(.+)$/);
      const logoMatch   = line.match(/tvg-logo="([^"]+)"/);
      const countryMatch = line.match(/tvg-country="([^"]+)"/);
      current = {
        group:   groupMatch?.[1]  ?? 'Other',
        name:    nameMatch?.[1]   ?? 'Unknown',
        logo:    logoMatch?.[1]   ?? '',
        country: countryMatch?.[1] ?? '',
      };
    } else if (line.startsWith('http') && current.name) {
      channels.push({ ...current, url: line.trim() } as Channel);
      current = {};
    }
  }
  return channels;
}

function sortSubGroupChips(chips: string[], category: 'radio' | 'music_channels' | 'music_audio'): string[] {
  if (category === 'music_channels') {
    // TV tab: Level 1 -> Level 2 -> Level 3 -> Level 4
    const level1 = chips.filter(g => g === '⭐ Popular' || g.toLowerCase().includes('popular'));
    const level4 = chips.filter(g => g.includes('VOD') || g.includes('📼'));
    
    // Level 3 list and keywords
    const level3List = ["📰 News", "🎬 Movies", "🧒 Kids", "🕌 Religious", "⚽ Sports", "💼 Business News", "🎨 Culture", "🎥 Documentary", "🎵 Music", "🎭 Entertainment", "🌦️ Weather", "🎓 Education"];
    const level3Keywords = ["News", "Movies", "Kids", "Religious", "Sports", "Business News", "Culture", "Documentary", "Music", "Entertainment", "Weather", "Education", "📰", "🎬", "🧒", "🕌", "⚽", "💼", "🎨", "🎥", "🎵", "🎭", "🌦️", "🎓"];
    
    const isLevel3 = (g: string) => {
      return level3List.includes(g) || level3Keywords.some(kw => g.includes(kw));
    };
    
    const level3 = chips.filter(g => !level1.includes(g) && !level4.includes(g) && isLevel3(g));
    const level2 = chips.filter(g => !level1.includes(g) && !level4.includes(g) && !level3.includes(g));
    
    return [...level1, ...level2, ...level3, ...level4];
  } else if (category === 'radio') {
    // Radio tab: show "⭐ Popular" first, then country groups
    const popular = chips.filter(g => g === '⭐ Popular' || g.toLowerCase().includes('popular'));
    const rest = chips.filter(g => !popular.includes(g));
    return [...popular, ...rest];
  } else {
    // Music tab: show genre groups in order of appearance in file
    return chips;
  }
}

export function IptvSection() {
  const resolvedTheme = useResolvedTheme();
  const { isMobile } = useDeviceType();

  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 600);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Storage and Stream lists
  const [streams, setStreams] = useState<StreamItem[]>(() => {
    try {
      const saved = localStorage.getItem('retro_tv_custom_playlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading custom playlist storage', e);
    }
    return DEFAULT_PRESET_STREAMS;
  });

  // Category view expansion system (radio, music_channels, music_audio)
  const [activeCategory, setActiveCategory] = useState<'radio' | 'music_channels' | 'music_audio'>('music_channels');
  const [activeStream, setActiveStream] = useState<StreamItem | null>(null);
  
  // Dynamic Group filters within category
  const [activeSubGroup, setActiveSubGroup] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Players & Controls State
  const [isTvOpen, setIsTvOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const v = localStorage.getItem('retro_tv_volume');
      const n = v ? parseFloat(v) : 0.8;
      return isNaN(n) ? 0.8 : Math.min(1, Math.max(0, n));
    } catch { return 0.8; }
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('retro_tv_muted') === 'true';
    } catch { return true; }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<StreamErrorType | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [listenStartTime, setListenStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function getLogoFallbackSvg(
    name: string,
    category: string
  ): string {
    // Generate a consistent color from the stream name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const bg = `hsl(${hue},40%,25%)`;
    const fg = `hsl(${hue},60%,70%)`;

    const icon = category === 'radio' ? '📻' : '📺';
    // First 2 chars of name as initials
    const initials = name.replace(/[^\w\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase();

    // Return as a data URI
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'>
      <rect width='20' height='20' fill='${bg}' rx='2'/>
      <text x='10' y='13' text-anchor='middle' font-size='9'
        font-family='monospace' fill='${fg}'>${initials || icon}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // Modal Custom Add/Edit Fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<'radio' | 'music_channels' | 'music_audio'>('music_channels');
  const [formGroup, setFormGroup] = useState('');
  const [formLogo, setFormLogo] = useState('');

  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const m3uLoadedRef = useRef(false);

  // Sorting status overlay banner State
  const [isSorting, setIsSorting] = useState(false);
  const [aiInfoMsg, setAiInfoMsg] = useState<string | null>(null);

  // Split scrollTop states per category for virtual scroll
  const [scrollTopMusic, setScrollTopMusic] = useState(0);
  const [scrollTopRadio, setScrollTopRadio] = useState(0);
  const [scrollTopMusicAudio, setScrollTopMusicAudio] = useState(0);

  // Refs for video player elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const backupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const probeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredStreamsRef = useRef<StreamItem[]>([]);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const [showKeyHints, setShowKeyHints] = useState(false);

  // Keyboard shortcut instructions outside click listener
  useEffect(() => {
    if (!showKeyHints) return;
    const handleOutsideClick = () => {
      setShowKeyHints(false);
    };
    const t = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    }, 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [showKeyHints]);

  // Health checking states
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const healthCheckRanRef = useRef(false);

  // Sync state with local storage
  const saveStreamsToStorage = (updatedList: StreamItem[]) => {
    setStreams(updatedList);
    try {
      localStorage.setItem('retro_tv_custom_playlist', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Could not write custom playlist back to storage', e);
    }
  };

  // Roll Dice - plays a randomly selected channel
  const playRandomStream = () => {
    if (streams.length === 0) return;
    const randomIndex = Math.floor(Math.random() * streams.length);
    const chosenStream = streams[randomIndex];
    
    // Safety check for category
    const cat = chosenStream.category || 'music_channels';
    setActiveCategory(cat);
    setActiveStream({
      ...chosenStream,
      currentQualityIndex: 0
    });
  };

  // Sort IPTV / Radio playlists alphabetically with numeric precedence on client-side
  const handleSortAlphabetically = () => {
    if (streams.length === 0) return;
    setIsSorting(true);
    setAiInfoMsg(resolvedTheme === 'bit' ? '⏳ SORTING A-Z...' : 'جاري الترتيب الأبجدي والقنوات...');
    try {
      const sorted = [...streams].sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
      saveStreamsToStorage(sorted);
      setAiInfoMsg(resolvedTheme === 'bit' ? '✨ SORTED SUCCESS!' : '✨ تم الترتيب الأبجدي بنجاح!');
      setTimeout(() => setAiInfoMsg(null), 3500);
    } catch (err: any) {
      console.error('Sort Error:', err);
      setAiInfoMsg(`❌ خطأ: ${err.message || 'فشل الترتيب'}`);
      setTimeout(() => setAiInfoMsg(null), 4000);
    } finally {
      setIsSorting(false);
    }
  };

  // Turn TV On if there are streams (restoring last active stream if available)
  useEffect(() => {
    if (streams.length > 0 && !activeStream) {
      let restoredStream: StreamItem | undefined = undefined;
      try {
        const lastId = localStorage.getItem('retro_tv_last_stream_id');
        if (lastId) {
          restoredStream = streams.find(s => s.id === lastId);
        }
      } catch (e) {
        console.error('Error reading retro_tv_last_stream_id', e);
      }

      if (restoredStream) {
        setActiveStream(restoredStream);
        if (restoredStream.category && restoredStream.category !== activeCategory) {
          setActiveCategory(restoredStream.category);
        }
      } else {
        const matchingCategory = streams.filter(s => s.category === activeCategory);
        if (matchingCategory.length > 0) {
          setActiveStream(matchingCategory[0]);
        } else {
          setActiveStream(streams[0]);
        }
      }
    }
  }, [streams, activeCategory, activeStream]);

  // Save last active stream ID on change
  useEffect(() => {
    if (activeStream?.id) {
      try {
        localStorage.setItem('retro_tv_last_stream_id', activeStream.id);
      } catch {}
    }
  }, [activeStream?.id]);

  // Audio suppressions for background ambient player
  useEffect(() => {
    const televisionAudioBusy = isTvOpen && isPlaying && !isMuted && !isLoading;
    if (televisionAudioBusy) {
      audioManager.suppressBg('iptv_broadcast');
      audioManager.pause('lens');
      audioManager.pause('mebit');
      audioManager.pause('song');
    } else {
      audioManager.releaseBg('iptv_broadcast');
    }
    return () => {
      audioManager.releaseBg('iptv_broadcast');
    };
  }, [isTvOpen, isPlaying, isMuted, isLoading]);

  const playNextStream = useCallback(() => {
    const list = filteredStreamsRef.current;
    if (!list || list.length <= 1) return;

    setActiveStream((current) => {
      if (!current) return list[0];
      const currentIndex = list.findIndex(s => s.id === current.id);
      if (currentIndex === -1) return list[0];
      const nextIndex = (currentIndex + 1) % list.length;
      return list[nextIndex];
    });
  }, []);

  // Handlers to parse and play different formats
  const playCurrentStream = useCallback((item: StreamItem) => {
    const video = videoRef.current;
    if (!video) return;

    // Flush past HLS instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current);
    if (probeTimeoutRef.current) {
      clearTimeout(probeTimeoutRef.current);
      probeTimeoutRef.current = null;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setErrorType(null);
    setIsPlaying(false);

    const activeQual = item.qualities[item.currentQualityIndex];
    if (!activeQual || !activeQual.url) {
      setErrorMsg('No usable Stream Link!');
      setIsLoading(false);
      return;
    }

    const streamUrl = activeQual.url.trim();
    const isHlsFormat = 
      streamUrl.toLowerCase().includes('.m3u8') ||
      streamUrl.toLowerCase().includes('manifest') ||
      streamUrl.toLowerCase().includes('/chunklist') ||
      streamUrl.toLowerCase().includes('smil:');

    const handleSuccess = () => {
      if (probeTimeoutRef.current) {
        clearTimeout(probeTimeoutRef.current);
        probeTimeoutRef.current = null;
      }
      setIsLoading(false);
      setErrorMsg(null);
      setErrorType(null);
      setIsPlaying(true);
      if (item.category === 'radio') {
        setListenStartTime(Date.now());
        setElapsedSeconds(0);
      }
      setStreams(prev => prev.map(s =>
        s.id === activeStream?.id
          ? { ...s, failCount: 0, lastSeen: Date.now(), hidden: false }
          : s
      ));
      // Also persist to localStorage:
      // (use a non-blocking setTimeout to avoid state batching issues)
      setTimeout(() => {
        try {
          const current = JSON.parse(
            localStorage.getItem('retro_tv_custom_playlist') ?? '[]'
          ) as StreamItem[];
          const updated = current.map(s =>
            s.id === activeStream?.id
              ? { ...s, failCount: 0, lastSeen: Date.now(), hidden: false }
              : s
          );
          localStorage.setItem('retro_tv_custom_playlist', JSON.stringify(updated));
        } catch {}
      }, 0);
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = isMuted;
        videoRef.current.play().catch(() => {
          // Fallback forced mute bypass for security policies
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    };

    const handleFailure = (errCol: string) => {
      if (probeTimeoutRef.current) {
        clearTimeout(probeTimeoutRef.current);
        probeTimeoutRef.current = null;
      }
      setIsLoading(false);
      setIsPlaying(false);

      const classifiedType = classifyStreamError(null, errCol);
      setErrorType(classifiedType);

      if (classifiedType === 'CORS_BLOCKED') {
        setErrorMsg('CORS BLOCKED'); // Trigger overlay render
        return;
      }

      const hasNextQuality = item.qualities.length > 1 && item.currentQualityIndex < item.qualities.length - 1;
      
      if (hasNextQuality) {
        const nextIdx = item.currentQualityIndex + 1;
        setErrorMsg(`Signal Low — Retrying backup stream link ${nextIdx + 1}/${item.qualities.length}...`);
        
        backupTimeoutRef.current = setTimeout(() => {
          setActiveStream((prev) => {
            if (!prev || prev.id !== item.id) return prev;
            return {
              ...prev,
              currentQualityIndex: nextIdx,
            };
          });
        }, 2200);
      } else {
        setErrorMsg('📡 انقطع البث — الانتقال للقناة التالية...');
        backupTimeoutRef.current = setTimeout(() => {
          playNextStream();
        }, 2000);
      }
    };

    // Start 5-second probe timeout
    probeTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      handleFailure('PROBE_TIMEOUT_5S');
    }, 5000);

    if (isHlsFormat) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari/iOS
        video.src = streamUrl;
        const onCanPlay = () => {
          handleSuccess();
          video.removeEventListener('canplay', onCanPlay);
        };
        const onErr = () => {
          handleFailure('NATIVE_HLS_ERR');
          video.removeEventListener('error', onErr);
        };
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onErr);
        video.load();
      } else if (Hls.isSupported()) {
        // Hls.js for Chrome/Firefox/Edge
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 15,
          manifestLoadingTimeOut: 6000,
          levelLoadingTimeOut: 6000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          handleSuccess();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              handleFailure('NETWORK_CORS_TIMEOUT');
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              handleFailure('STREAM_DEFEATED');
            }
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else {
        handleFailure('HLS_NOT_SUPPORTED_BROWSER');
      }
    } else {
      // Direct progressive files (like MP4) or Radio audio assets
      video.src = streamUrl;
      const onCanPlay = () => {
        handleSuccess();
        video.removeEventListener('canplay', onCanPlay);
      };
      const onErr = () => {
        handleFailure('MEDIA_FILE_INVALID');
        video.removeEventListener('error', onErr);
      };
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onErr);
      video.load();
    }
  }, [volume, isMuted, playNextStream]);

  // Load active channel on mount/changes
  useEffect(() => {
    if (activeStream && isTvOpen) {
      playCurrentStream(activeStream);
    }
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current);
      if (probeTimeoutRef.current) {
        clearTimeout(probeTimeoutRef.current);
        probeTimeoutRef.current = null;
      }
    };
  }, [activeStream, activeStream?.currentQualityIndex, isTvOpen, playCurrentStream]);

  // Auto-scroll active item into view & reset radio elapsed timer
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
    setListenStartTime(null);
    setElapsedSeconds(0);
  }, [activeStream?.id]);

  // Start interval to update elapsedSeconds for radio stream
  useEffect(() => {
    if (isPlaying && activeCategory === 'radio' && listenStartTime !== null) {
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - listenStartTime!) / 1000));
      }, 1000);
    } else {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    }
    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    };
  }, [isPlaying, activeCategory, listenStartTime]);

  // Reset SubGroup filter if activeCategory flips
  useEffect(() => {
    setActiveSubGroup('All');
  }, [activeCategory]);

  // Synchronize Scroll Top values on changes to prevent blank panes in Virtual Scroll
  useEffect(() => {
    setScrollTopMusic(0);
    setScrollTopRadio(0);
    setScrollTopMusicAudio(0);
  }, [activeCategory, activeSubGroup, searchQuery]);

  // FEATURE 1 — AUTO-LOAD M3U PLAYLISTS ON MOUNT
  useEffect(() => {
    // Check if localStorage already has data from a previous session
    const hasSavedPlaylists = localStorage.getItem('retro_tv_custom_playlist') !== null;
    if (hasSavedPlaylists) {
      return;
    }
    // Prevent double-fetching in React StrictMode
    if (m3uLoadedRef.current) return;
    m3uLoadedRef.current = true;

    const m3uPlaylists = [
      { url: STREAM_SOURCES.CHANNELS, defaultCategory: 'music_channels' as const },
      { url: STREAM_SOURCES.RADIO, defaultCategory: 'radio' as const },
      { url: STREAM_SOURCES.MUSIC, defaultCategory: 'music_audio' as const }
    ];

    async function fetchPlaylists() {
      setIsLoadingPlaylists(true);
      const existingUrls = new Set(streams.map(s => s.url.trim().toLowerCase()));
      const newStreams: StreamItem[] = [];

      for (const playlist of m3uPlaylists) {
        try {
          const res = await fetch(playlist.url, { cache: 'no-store' });
          if (!res.ok) continue;
          const text = await res.text();
          
          const parsedChannels = parseM3U(text);
          for (const ch of parsedChannels) {
            const lowerUrl = ch.url.toLowerCase();
            if (existingUrls.has(lowerUrl)) {
              continue;
            }

            // Determine category based on URL
            let category: 'radio' | 'music_channels' | 'music_audio' = playlist.defaultCategory;
            if (
              lowerUrl.includes('.mp4') || 
              lowerUrl.includes('.mkv') || 
              lowerUrl.includes('.avi') || 
              lowerUrl.includes('.mov')
            ) {
              category = 'music_channels';
            } else if (
              lowerUrl.includes('mp3') ||
              lowerUrl.includes('aac') ||
              lowerUrl.includes('icecast') ||
              lowerUrl.includes('.mp3') ||
              lowerUrl.includes('/radio') ||
              lowerUrl.includes('stream.zeno') ||
              lowerUrl.includes('streamafrica') ||
              lowerUrl.includes('radioca') ||
              lowerUrl.includes('musicradio') ||
              lowerUrl.includes('dlf.de') ||
              lowerUrl.includes('radioparadise') ||
              lowerUrl.includes('bbcmedia') ||
              lowerUrl.includes('infomaniak.ch') ||
              lowerUrl.includes('/music/') ||
              lowerUrl.includes('/jazz/') ||
              lowerUrl.includes('/classical/')
            ) {
              category = playlist.defaultCategory === 'music_audio' ? 'music_audio' : 'radio';
            }

            // Choose group default if missing
            const finalGroup = ch.group || 'Morocco';

            // Logo default if missing
            let defaultLogo = 'https://i.imgur.com/Ki3ySUE.png';
            if (category === 'radio' || category === 'music_audio') {
              defaultLogo = 'https://i.imgur.com/3YsZPY6.jpeg';
            }
            const finalLogo = ch.logo || defaultLogo;

            // Generate unique id
            const itemId = `m3u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            const newItem: StreamItem = {
              id: itemId,
              name: ch.name || 'Unnamed Stream',
              category,
              group: finalGroup,
              logo: finalLogo,
              url: ch.url,
              qualities: [{ quality: 'Auto', url: ch.url }],
              currentQualityIndex: 0
            };

            newStreams.push(newItem);
            existingUrls.add(lowerUrl);
          }
        } catch (err) {
          // Silently skip playlist if any fetch or network fails
        }
      }

      if (newStreams.length > 0) {
        setStreams(prev => {
          const merged = [...prev, ...newStreams];
          try {
            localStorage.setItem('retro_tv_custom_playlist', JSON.stringify(merged));
          } catch (e) {
            console.error('Could not write custom playlist back to storage', e);
          }
          return merged;
        });
      }
      setIsLoadingPlaylists(false);
    }

    fetchPlaylists();
  }, []);

  const checkStreamHealth = async (url: string): Promise<'ALIVE' | 'CORS' | 'DEAD'> => {
    try {
      const controller = new AbortController();
      const abortTimeout = setTimeout(() => controller.abort(), 5000);

      let response: Response;
      try {
        response = await fetch(url, { 
          method: 'HEAD', 
          signal: controller.signal, 
          cache: 'no-store' 
        });
      } catch (err: any) {
        clearTimeout(abortTimeout);
        if (err.name === 'AbortError') {
          return 'ALIVE'; // ALIVE
        }
        const errType = classifyStreamError(err);
        if (errType === 'CORS_BLOCKED') {
          return 'CORS'; // CORS blocked is ALIVE
        }
        return 'DEAD'; // DEAD
      }

      clearTimeout(abortTimeout);

      if (response.status === 405) {
        const getController = new AbortController();
        const getAbortTimeout = setTimeout(() => getController.abort(), 5000);

        try {
          const getResponse = await fetch(url, {
            method: 'GET',
            headers: { 'Range': 'bytes=0-0' },
            signal: getController.signal,
            cache: 'no-store'
          });
          clearTimeout(getAbortTimeout);
          return getResponse.ok ? 'ALIVE' : 'DEAD';
        } catch (getErr: any) {
          clearTimeout(getAbortTimeout);
          if (getErr.name === 'AbortError') {
            return 'ALIVE'; // ALIVE
          }
          const errType = classifyStreamError(getErr);
          if (errType === 'CORS_BLOCKED') {
            return 'CORS'; // CORS blocked is ALIVE
          }
          return 'DEAD'; // DEAD
        }
      }

      return response.ok ? 'ALIVE' : 'DEAD';
    } catch (e) {
      return 'DEAD'; // DEAD
    }
  };

  const runBackgroundHealthCheck = async (streamList: StreamItem[]) => {
    setIsHealthChecking(true);
    const healthResults = new Map<string, 'ALIVE' | 'CORS' | 'DEAD'>();

    const BATCH_SIZE = 4;
    const streamsToCheck = streamList.filter(s => {
      if (s.id.startsWith('pr_')) return false;
      const lowerUrl = s.url.toLowerCase();
      if (lowerUrl.includes('archive.org') || lowerUrl.includes('.mp4') || lowerUrl.includes('.mkv')) return false;
      return true;
    });

    for (let i = 0; i < streamsToCheck.length; i += BATCH_SIZE) {
      const batch = streamsToCheck.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (stream) => {
          const status = await checkStreamHealth(stream.url);
          return { id: stream.id, status };
        })
      );

      for (const res of results) {
        if (res.status === 'fulfilled') {
          healthResults.set(res.value.id, res.value.status);
        }
      }
    }

    setStreams((currentStreams) => {
      const updatedStreams = currentStreams.map(stream => {
        if (stream.id.startsWith('pr_')) return stream; // never touch presets

        const result = healthResults.get(stream.id);
        if (!result) return stream;

        if (result === 'ALIVE') {
          // Reset fail count on success
          return { ...stream, failCount: 0, lastSeen: Date.now() };
        }
        if (result === 'CORS') {
          // CORS = alive, don't penalize
          return stream;
        }
        if (result === 'DEAD') {
          const newFailCount = (stream.failCount ?? 0) + 1;
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const isOld = !stream.lastSeen || stream.lastSeen < sevenDaysAgo;

          if (newFailCount >= 3 && isOld) {
            return null; // mark for removal
          }
          return { ...stream, failCount: newFailCount, hidden: newFailCount >= 2 };
        }
        return stream;
      }).filter(Boolean) as StreamItem[];

      try {
        localStorage.setItem('retro_tv_custom_playlist', JSON.stringify(updatedStreams));
      } catch (e) {
        console.error("Could not write custom playlist after health check", e);
      }
      return updatedStreams;
    });

    setIsHealthChecking(false);
  };

  // Trigger health check once M3U is successfully completed
  useEffect(() => {
    if (isTvOpen && !isLoadingPlaylists && !healthCheckRanRef.current && streams.length > 5) {
      healthCheckRanRef.current = true;
      runBackgroundHealthCheck(streams);
    }
  }, [isTvOpen, isLoadingPlaylists, streams]);

  // Fullscreen implementation
  const toggleFullscreen = useCallback(() => {
    if (isMobile) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen().catch(() => {});
        const orientation = screen.orientation as any;
        if (orientation && orientation.lock) {
          orientation.lock('landscape').catch(() => {});
        }
        return;
      }
    }
    const el = playerWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, [isMobile]);

  useEffect(() => {
    const monitorFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', monitorFullscreen);
    return () => document.removeEventListener('fullscreenchange', monitorFullscreen);
  }, []);

  // Controls Handlers
  const handleVolumeChange = (val: number) => {
    setVolume(val);
    try {
      localStorage.setItem('retro_tv_volume', String(val));
    } catch {}
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val > 0) {
        setIsMuted(false);
        try {
          localStorage.setItem('retro_tv_muted', 'false');
        } catch {}
        videoRef.current.muted = false;
      }
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const nextMute = !prev;
      if (videoRef.current) videoRef.current.muted = nextMute;
      try {
        localStorage.setItem('retro_tv_muted', String(nextMute));
      } catch {}
      return nextMute;
    });
  };

  const handleTogglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  useEffect(() => {
    if (!isTvOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not hijack keyboard when user is typing in search or modal
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.tagName === 'SELECT' ||
                       target.isContentEditable;
      if (isTyping) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight': {
          e.preventDefault();
          const list = filteredStreamsRef.current;
          if (list.length < 2) break;
          const idx = list.findIndex(s => s.id === activeStream?.id);
          const nextIdx = idx === -1 ? 0 : (idx + 1) % list.length;
          const next = list[nextIdx];
          setActiveStream({ ...next, currentQualityIndex: 0 });
          break;
        }
        case 'ArrowUp':
        case 'ArrowLeft': {
          e.preventDefault();
          const list = filteredStreamsRef.current;
          if (list.length < 2) break;
          const idx = list.findIndex(s => s.id === activeStream?.id);
          const prevIdx = idx === -1 ? list.length - 1 : (idx - 1 + list.length) % list.length;
          const prev = list[prevIdx];
          setActiveStream({ ...prev, currentQualityIndex: 0 });
          break;
        }
        case ' ':
          e.preventDefault();
          handleTogglePlayback();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else if (isModalOpen) {
            setIsModalOpen(false);
          } else {
            setIsTvOpen(false);
          }
          break;
        case '1':
          setActiveCategory('music_channels');
          break;
        case '2':
          setActiveCategory('radio');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTvOpen, activeStream,
    isModalOpen, handleTogglePlayback, handleToggleMute, toggleFullscreen
  ]);

  // ADD / EDIT Modal Actions
  const handleOpenAdd = () => {
    setFormName('');
    setFormUrl('');
    setFormCategory(activeCategory);
    setFormGroup('');
    setFormLogo('');
    setModalMode('add');
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StreamItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormName(item.name);
    // Combine quality urls if backup links are specified
    const allUrls = item.qualities.map(q => q.url).join(', ');
    setFormUrl(allUrls);
    setFormCategory(item.category);
    setFormGroup(item.group || '');
    setFormLogo(item.logo || '');
    setModalMode('edit');
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const handleDeleteStream = (idToDel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = streams.filter(s => s.id !== idToDel);
    
    // Choose next stream if active was deleted
    let nextStream = activeStream;
    if (activeStream?.id === idToDel) {
      const leftInCat = updated.filter(s => s.category === activeCategory);
      nextStream = leftInCat.length > 0 ? leftInCat[0] : (updated.length > 0 ? updated[0] : null);
    }

    saveStreamsToStorage(updated);
    setActiveStream(nextStream);
  };

  const handleSaveStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;

    // Support comma or semicolon separated backups for backup/failover logic
    const inputUrls = formUrl.split(/[,;]+/).map(u => u.trim()).filter(Boolean);
    const generatedQualities = inputUrls.map((urlStr, idx) => {
      const qLabel = inputUrls.length === 1 ? 'Source' : `Backup #${idx + 1}`;
      return { quality: qLabel, url: urlStr };
    });

    const standardGroup = formGroup.trim() || 'General';

    if (modalMode === 'add') {
      const newStream: StreamItem = {
        id: `custom_${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        group: standardGroup,
        logo: formLogo.trim() || 'https://i.imgur.com/Ki3ySUE.png',
        url: generatedQualities[0].url,
        qualities: generatedQualities,
        currentQualityIndex: 0
      };

      const updated = [...streams, newStream];
      saveStreamsToStorage(updated);
      setActiveCategory(formCategory);
      setActiveStream(newStream);
    } else if (modalMode === 'edit' && editId) {
      const updated = streams.map(s => {
        if (s.id === editId) {
          return {
            ...s,
            name: formName.trim(),
            category: formCategory,
            group: standardGroup,
            logo: formLogo.trim() || 'https://i.imgur.com/Ki3ySUE.png',
            url: generatedQualities[0].url,
            qualities: generatedQualities,
            currentQualityIndex: 0
          };
        }
        return s;
      });

      saveStreamsToStorage(updated);
      const replacedUnit = updated.find(s => s.id === editId);
      if (replacedUnit) {
        setActiveCategory(formCategory);
        setActiveStream(replacedUnit);
      }
    }

    setIsModalOpen(false);
  };

  // Import / Export backup handler for high security
  const handleResetToPresets = () => {
    if (window.confirm('هل تريد إعادة تعيين كافة البثوث إلى القنوات التلقائية؟ (جميع القنوات المخصصة ستحذف)')) {
      saveStreamsToStorage(DEFAULT_PRESET_STREAMS);
      setActiveStream(DEFAULT_PRESET_STREAMS[0]);
    }
  };

  const THEME_SKIN = {
    light: {
      windowTitle: 'live_broadcast_deck.exe',
      closedTitle: 'live_broadcast_deck.exe',
      outerBg: '#D8D4CC',
      headerGradient: 'from-zinc-700 to-zinc-500',
      sidebarBg: 'bg-zinc-200',
      sidebarHeader: 'bg-zinc-300',
      listBg: 'bg-zinc-100',
      activePill: 'bg-blue-800 text-white',
      footerBg: 'bg-[#C0C0C0]',
      statusScreen: 'bg-black text-[#00FF00]',
      borderStyle: '2px solid',
      scanlines: true,
      imageFilter: 'none',
    },
    dark: {
      windowTitle: 'broadcast_terminal.sh',
      closedTitle: 'broadcast_terminal.sh',
      outerBg: '#0A0A0A',
      headerGradient: 'from-[#0d0d0d] to-[#1a1a1a]',
      sidebarBg: 'bg-[#0f0f0f]',
      sidebarHeader: 'bg-[#111]',
      listBg: 'bg-[#080808]',
      activePill: 'bg-[#B8FF3F] text-black',
      footerBg: 'bg-[#0d0d0d]',
      statusScreen: 'bg-black text-[#B8FF3F]',
      borderStyle: '1px solid #333',
      scanlines: true,
      imageFilter: 'brightness(0.7) contrast(1.2) saturate(0)',
    },
    bit: {
      windowTitle: 'RETRO_TV_8BIT.EXE',
      closedTitle: 'RETRO_TV_8BIT.EXE',
      outerBg: '#1a1032',
      headerGradient: 'from-[#2d1b69] to-[#1a0f3c]',
      sidebarBg: 'bg-[#1a1032]',
      sidebarHeader: 'bg-[#2d1b69]',
      listBg: 'bg-[#120b25]',
      activePill: 'bg-[#ff00ff] text-white',
      footerBg: 'bg-[#2d1b69]',
      statusScreen: 'bg-[#120b25] text-[#00ffff]',
      borderStyle: '2px solid #ff00ff',
      scanlines: true,
      imageFilter: 'hue-rotate(180deg) saturate(2) brightness(0.8)',
    },
    midnight: {
      windowTitle: 'midnight_stream.cfg',
      closedTitle: 'midnight_stream.cfg',
      outerBg: '#0c1929',
      headerGradient: 'from-[#0c1929] to-[#162237]',
      sidebarBg: 'bg-[#0c1929]',
      sidebarHeader: 'bg-[#101f30]',
      listBg: 'bg-[#080f1a]',
      activePill: 'bg-[#3b82f6] text-white',
      footerBg: 'bg-[#0c1929]',
      statusScreen: 'bg-[#040a12] text-[#60a5fa]',
      borderStyle: '1px solid #1e3a5f',
      scanlines: false,
      imageFilter: 'brightness(0.6) saturate(0.5) hue-rotate(200deg)',
    }
  };

  const skin = THEME_SKIN[resolvedTheme as keyof typeof THEME_SKIN] || THEME_SKIN.light;

  const closedInnerContent = (
    <div className="flex flex-col items-center gap-4 p-4 font-mono text-center">
      <img 
        src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/TV.webp"
        alt="Retro TV"
        referrerPolicy="no-referrer"
        className={`w-full rounded object-cover cursor-pointer transition-all duration-300 hover:scale-[1.03] animate-pulse ${isMobile ? 'max-w-[280px]' : 'max-w-sm'}`}
        style={{
          filter: resolvedTheme === 'dark' ? 'brightness(0.7) grayscale(1)' : 
                  resolvedTheme === 'bit' ? 'hue-rotate(180deg) saturate(2)' : 
                  resolvedTheme === 'midnight' ? 'brightness(0.6) hue-rotate(200deg)' : 'none',
          border: resolvedTheme === 'dark' ? (isMobile ? '1px solid #B8FF3F' : '2px solid #B8FF3F') : 
                  resolvedTheme === 'bit' ? (isMobile ? '2px outline #ff00ff' : '3px solid #ff00ff') : 
                  resolvedTheme === 'midnight' ? '1px solid #1e3a5f' : (isMobile ? '1px solid #71717a' : '2px solid #71717a'),
          boxShadow: resolvedTheme === 'dark' ? (isMobile ? '0 0 10px rgba(184,255,63,0.3)' : '0 0 20px rgba(184,255,63,0.3)') : 
                     resolvedTheme === 'bit' ? (isMobile ? '0 0 3px #ff00ff' : '0 0 0 3px #00ffff, 0 0 0 6px #ff00ff') : 
                     resolvedTheme === 'midnight' ? (isMobile ? '0 0 15px rgba(37,99,235,0.2)' : '0 0 30px rgba(37,99,235,0.2)') : 'none',
        }}
      />
      <div className={`text-base font-bold select-none ${
        resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : 
        resolvedTheme === 'bit' ? 'text-[#ff00ff]' : 
        resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-800'
      }`}>
        بغيتي تفرج؟ علاش لا؟
      </div>
      <div className={`text-[10px] select-none ${
        resolvedTheme === 'dark' ? 'text-zinc-400' : 
        resolvedTheme === 'bit' ? 'text-[#00ffff]' : 
        resolvedTheme === 'midnight' ? 'text-[#94a3b8]' : 'text-zinc-500'
      }`}>
            التلفاز ظهر
      </div>
    </div>
  );

  // Filter listings based on Active View Panel & sub-group rules
  const getCategorizedStreams = (cat: 'radio' | 'music_channels' | 'music_audio') => {
    return streams.filter(s => s.category === cat);
  };

  // Extra categories scanner for dynamically building subgroups for layout chips
  const currentCategoryStreams = getCategorizedStreams(activeCategory);
  const rawSubGroupChips = Array.from(new Set(currentCategoryStreams.map(s => s.group))).filter(Boolean);
  const subGroupChips = sortSubGroupChips(rawSubGroupChips, activeCategory);

  const filteredVisibleStreams = currentCategoryStreams.filter(s => {
    const matchesSubGroup = activeSubGroup === 'All' || s.group === activeSubGroup;
    const matchesKeyword = dynamicFuzzyMatch(s.name, searchQuery);
    return matchesSubGroup && matchesKeyword;
  }).filter(s => !s.hidden);

  filteredStreamsRef.current = filteredVisibleStreams;

  // Render components shared between mobile stack and desktop sidebar
  const renderTabSwitcher = () => {
    const isTvActive = activeCategory === 'music_channels';
    const isRadioActive = activeCategory === 'radio';
    const isMusicAudioActive = activeCategory === 'music_audio';

    let tvTabClass = '';
    let radioTabClass = '';
    let musicAudioTabClass = '';

    if (resolvedTheme === 'dark') {
      tvTabClass = isTvActive ? 'bg-[#B8FF3F] text-black font-bold' : 'bg-[#111] text-[#B8FF3F]';
      radioTabClass = isRadioActive ? 'bg-[#B8FF3F] text-black font-bold' : 'bg-[#111] text-[#B8FF3F]';
      musicAudioTabClass = isMusicAudioActive ? 'bg-[#B8FF3F] text-black font-bold' : 'bg-[#111] text-[#B8FF3F]';
    } else if (resolvedTheme === 'bit') {
      tvTabClass = isTvActive ? 'bg-[#ff00ff] text-white font-bold' : 'bg-[#2d1b69] text-[#00ffff]';
      radioTabClass = isRadioActive ? 'bg-[#ff00ff] text-white font-bold' : 'bg-[#2d1b69] text-[#00ffff]';
      musicAudioTabClass = isMusicAudioActive ? 'bg-[#ff00ff] text-white font-bold' : 'bg-[#2d1b69] text-[#00ffff]';
    } else if (resolvedTheme === 'midnight') {
      tvTabClass = isTvActive ? 'bg-[#2563eb] text-white font-bold' : 'bg-[#0c1929] text-[#94a3b8]';
      radioTabClass = isRadioActive ? 'bg-[#2563eb] text-white font-bold' : 'bg-[#0c1929] text-[#94a3b8]';
      musicAudioTabClass = isMusicAudioActive ? 'bg-[#2563eb] text-white font-bold' : 'bg-[#0c1929] text-[#94a3b8]';
    } else {
      // light
      tvTabClass = isTvActive ? 'bg-zinc-800 text-white font-bold' : 'bg-zinc-300 text-zinc-700';
      radioTabClass = isRadioActive ? 'bg-zinc-800 text-white font-bold' : 'bg-zinc-300 text-zinc-700';
      musicAudioTabClass = isMusicAudioActive ? 'bg-zinc-800 text-white font-bold' : 'bg-zinc-300 text-zinc-700';
    }

    return (
      <div className={`grid grid-cols-3 ${isMobile ? 'h-12' : 'h-9'} flex-shrink-0 border-b w-full ${
        resolvedTheme === 'dark' ? 'border-[#1f1f1f]' : 
        resolvedTheme === 'bit' ? 'border-[#ff00ff]' : 
        resolvedTheme === 'midnight' ? 'border-[#1e3a5f]' : 'border-zinc-400'
      }`}>
        <button
          onClick={() => setActiveCategory('music_channels')}
          className={`flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
            isMobile ? 'text-xs h-12' : 'text-[9px] h-9'
          } ${tvTabClass}`}
        >
          <Tv className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          <span>{resolvedTheme === 'bit' ? 'TV' : '📺 تلفزة'}</span>
        </button>
        <button
          onClick={() => setActiveCategory('radio')}
          className={`flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
            isMobile ? 'text-xs h-12' : 'text-[9px] h-9'
          } ${radioTabClass}`}
        >
          <Radio className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          <span>{resolvedTheme === 'bit' ? 'RADIO' : '📻 راديو'}</span>
        </button>
        <button
          onClick={() => setActiveCategory('music_audio')}
          className={`flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
            isMobile ? 'text-xs h-12' : 'text-[9px] h-9'
          } ${musicAudioTabClass}`}
        >
          <span className={isMobile ? 'text-sm' : 'text-xs'}>🎵</span>
          <span>{resolvedTheme === 'bit' ? 'MUSIC' : 'موسيقى'}</span>
        </button>
      </div>
    );
  };

  const renderSearchBar = () => {
    return (
      <div className={`border-b p-2 flex flex-col gap-1.5 flex-shrink-0 w-full ${
        resolvedTheme === 'dark' ? 'bg-[#151515] border-[#1f1f1f]' : 
        resolvedTheme === 'bit' ? 'bg-[#2d1b69] border-[#ff00ff]' : 
        resolvedTheme === 'midnight' ? 'bg-[#101f30] border-[#1e3a5f]' : 'bg-zinc-300 border-zinc-400'
      }`}>
        <div className={`flex items-center p-1 rounded border-2 ${
          isMobile ? 'h-11 px-3' : 'h-8'
        } ${
          resolvedTheme === 'dark' ? 'bg-[#050505] border-[#333]' : 
          resolvedTheme === 'bit' ? 'bg-[#120b25] border-[#00ffff]' : 
          resolvedTheme === 'midnight' ? 'bg-[#040a12] border-[#1e3a5f]' : 'bg-white border-zinc-500'
        }`}>
          <Search className={`mr-1 ${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${
            resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : 
            resolvedTheme === 'bit' ? 'text-[#00ffff]' : 
            resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-500'
          }`} />
          <input
            type="text"
            dir="auto"
            placeholder="بحث ذكي بالأقسام والروابط..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`bg-transparent border-none outline-none text-xs w-full font-sans ${
              resolvedTheme === 'dark' ? 'text-[#B8FF3F] placeholder-[#B8FF3F]/30' : 
              resolvedTheme === 'bit' ? 'text-[#00ffff] placeholder-[#00ffff]/40 font-mono' : 
              resolvedTheme === 'midnight' ? 'text-[#60a5fa] placeholder-[#1e3a5f]' : 'text-zinc-900'
            }`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={isMobile ? 'p-1 min-w-[32px] min-h-[32px] flex items-center justify-center' : ''}>
              <X className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSubGroups = () => {
    if (subGroupChips.length === 0) return null;
    return (
      <div className={`p-1.5 flex flex-wrap gap-1 max-h-24 overflow-y-auto flex-shrink-0 w-full ${
        isMobile ? 'border-b py-2' : 'border-t'
      } ${
        resolvedTheme === 'dark' ? 'bg-[#151515] border-[#1f1f1f]' : 
        resolvedTheme === 'bit' ? 'bg-[#2d1b69] border-[#ff00ff]' : 
        resolvedTheme === 'midnight' ? 'bg-[#101f30] border-[#1e3a5f]' : 'bg-zinc-300 border-zinc-400'
      }`}>
        <button
          onClick={() => setActiveSubGroup('All')}
          style={{ minHeight: isMobile ? '36px' : 'auto', minWidth: isMobile ? '44px' : 'auto' }}
          className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
            isMobile ? 'text-xs px-2.5 py-1' : ''
          } ${
            activeSubGroup === 'All' 
              ? (resolvedTheme === 'dark' ? 'bg-[#B8FF3F] text-black border-[#B8FF3F] font-bold' : 
                 resolvedTheme === 'bit' ? 'bg-[#00ffff] text-black border-[#00ffff] font-bold' : 
                 resolvedTheme === 'midnight' ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-zinc-950 text-white border-zinc-950')
              : (resolvedTheme === 'dark' ? 'bg-[#050505] text-[#B8FF3F]/70 border-[#333] hover:text-[#B8FF3F]' : 
                 resolvedTheme === 'bit' ? 'bg-[#120b25] text-[#00ffff]/70 border-[#00ffff]/30 hover:text-[#00ffff]' : 
                 resolvedTheme === 'midnight' ? 'bg-[#040a12] text-[#94a3b8] border-[#1e3a5f] hover:text-white' : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200')
          }`}
        >
          {resolvedTheme === 'bit' ? 'ALL' : 'الكل'}
        </button>
        {subGroupChips.map(g => (
          <button
            key={g}
            onClick={() => setActiveSubGroup(g)}
            style={{ minHeight: isMobile ? '36px' : 'auto', minWidth: isMobile ? '44px' : 'auto' }}
            className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
              isMobile ? 'text-xs px-2.5 py-1' : ''
            } ${
              activeSubGroup === g
                ? (resolvedTheme === 'dark' ? 'bg-[#B8FF3F] text-black border-[#B8FF3F] font-bold' : 
                   resolvedTheme === 'bit' ? 'bg-[#00ffff] text-black border-[#00ffff] font-bold' : 
                   resolvedTheme === 'midnight' ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-zinc-950 text-white border-zinc-950')
                : (resolvedTheme === 'dark' ? 'bg-[#050505] text-[#B8FF3F]/70 border-[#333] hover:text-[#B8FF3F]' : 
                   resolvedTheme === 'bit' ? 'bg-[#120b25] text-[#00ffff]/70 border-[#00ffff]/30 hover:text-[#00ffff]' : 
                   resolvedTheme === 'midnight' ? 'bg-[#040a12] text-[#94a3b8] border-[#1e3a5f] hover:text-white' : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200')
            }`}
          >
            {g}
          </button>
        ))}
      </div>
    );
  };

  const renderStreamList = () => {
    const listHeight = isMobile ? Math.max(200, windowHeight - 320) : 340;
    const itemHeight = isMobile ? 54 : 44;
    return (
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Sort Info Banner */}
        {aiInfoMsg && (
          <div className={`p-2 text-center text-[10px] font-mono font-medium transition-all animate-bounce ${
            isSorting 
              ? 'bg-blue-600/25 text-blue-300 border-b border-blue-500/20' 
              : aiInfoMsg.startsWith('❌') 
                ? 'bg-red-600/25 text-red-300 border-b border-red-500/20' 
                : 'bg-green-600/25 text-green-300 border-b border-green-500/20'
          }`}>
            {aiInfoMsg}
          </div>
        )}

        <div 
          onScroll={(e) => {
            if (activeCategory === 'music_channels') {
              setScrollTopMusic(e.currentTarget.scrollTop);
            } else if (activeCategory === 'radio') {
              setScrollTopRadio(e.currentTarget.scrollTop);
            } else if (activeCategory === 'music_audio') {
              setScrollTopMusicAudio(e.currentTarget.scrollTop);
            }
          }}
          className={`flex-1 overflow-y-auto divide-y ${skin.listBg} ${
            resolvedTheme === 'dark' ? 'divide-[#1f1f1f]' : 
            resolvedTheme === 'bit' ? 'divide-[#ff00ff]/20' : 
            resolvedTheme === 'midnight' ? 'divide-[#1e3a5f]/40' : 'divide-zinc-200'
          }`}
          style={{ height: `${listHeight}px` }}
        >
          {filteredVisibleStreams.length === 0 ? (
            <div className={`p-4 text-center text-[10px] font-sans ${
              isMobile ? 'text-xs' : ''
            } ${
              resolvedTheme === 'dark' ? 'text-zinc-500' : 
              resolvedTheme === 'bit' ? 'text-[#00ffff]' : 
              resolvedTheme === 'midnight' ? 'text-[#94a3b8]' : 'text-zinc-500'
            }`}>
              {resolvedTheme === 'bit' ? 'NO CHANNELS FOUND' : 'لا توجد قنوات مطابقة.'}
            </div>
          ) : (() => {
            const total = filteredVisibleStreams.length;
            const currentScrollTop = activeCategory === 'music_channels' 
              ? scrollTopMusic 
              : activeCategory === 'radio' 
                ? scrollTopRadio 
                : scrollTopMusicAudio;
            const visibleStart = Math.floor(currentScrollTop / itemHeight);
            const visibleEnd = Math.min(total, visibleStart + Math.ceil(listHeight / itemHeight) + 3);
            const slicedItems = filteredVisibleStreams.slice(visibleStart, visibleEnd);
            const topSpacerHeight = visibleStart * itemHeight;
            const bottomSpacerHeight = Math.max(0, (total - visibleEnd) * itemHeight);

            return (
              <>
                <div style={{ height: `${topSpacerHeight}px` }} />
                {slicedItems.map(item => (
                  <div
                    key={item.id}
                    ref={activeStream?.id === item.id ? activeItemRef : null}
                    onClick={() => {
                      setActiveStream({
                        ...item,
                        currentQualityIndex: 0
                      });
                    }}
                    className={`p-2 transition-colors cursor-pointer flex items-center justify-between group opacity-0 animate-fadeIn ${
                      activeStream?.id === item.id 
                        ? (resolvedTheme === 'dark' ? 'bg-[#B8FF3F] text-black font-bold' : 
                           resolvedTheme === 'bit' ? 'bg-[#ff00ff] text-white font-black' : 
                           resolvedTheme === 'midnight' ? 'bg-[#2563eb] text-white' : 'bg-blue-800 text-white')
                        : (resolvedTheme === 'dark' ? 'hover:bg-[#151515] text-zinc-300' : 
                           resolvedTheme === 'bit' ? 'hover:bg-[#ff00ff]/10 text-[#00ffff]' : 
                           resolvedTheme === 'midnight' ? 'hover:bg-[#101f30] text-[#94a3b8]' : 'hover:bg-zinc-200 text-zinc-950')
                    }`}
                    style={{ height: `${itemHeight}px` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <img
                        loading="lazy"
                        src={item.logo}
                        alt=""
                        className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} object-contain bg-white rounded border border-zinc-300 flex-shrink-0`}
                        onError={(e) => {
                          e.currentTarget.onerror = null; // prevent infinite loop
                          e.currentTarget.src = getLogoFallbackSvg(item.name, item.category);
                        }}
                      />
                      <div className="min-w-0">
                        <div className={`font-bold truncate ${isMobile ? 'text-xs' : 'text-[11px]'} ${resolvedTheme === 'bit' ? 'uppercase' : ''}`}>{item.name}</div>
                        <div className={`text-[9px] truncate opacity-70`}>{item.group}</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-1 transition-opacity ${
                      isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <button
                        onClick={(e) => handleOpenEdit(item, e)}
                        className={`p-1.5 rounded-sm ${
                          isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''
                        } ${resolvedTheme === 'dark' ? 'hover:bg-[#222]' : resolvedTheme === 'bit' ? 'hover:bg-[#ff00ff]/20' : resolvedTheme === 'midnight' ? 'hover:bg-[#101f30]' : 'hover:bg-zinc-400'}`}
                        title="تعديل"
                      >
                        <Edit3 className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} ${resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : resolvedTheme === 'bit' ? 'text-[#00ffff]' : 'text-emerald-800'}`} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteStream(item.id, e)}
                        className={`p-1.5 rounded-sm ${
                          isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''
                        } ${resolvedTheme === 'dark' ? 'hover:bg-[#222]' : resolvedTheme === 'bit' ? 'hover:bg-[#ff00ff]/20' : resolvedTheme === 'midnight' ? 'hover:bg-[#101f30]' : 'hover:bg-zinc-400'}`}
                        title="حذف"
                      >
                        <Trash2 className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-red-600`} />
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ height: `${bottomSpacerHeight}px` }} />
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  const renderBottomStatsAndActions = () => {
    return (
      <div className={`border-t p-2 flex flex-col gap-2 flex-shrink-0 w-full ${
        resolvedTheme === 'dark' ? 'bg-[#151515] border-[#1f1f1f]' : 
        resolvedTheme === 'bit' ? 'bg-[#2d1b69] border-[#ff00ff]' : 
        resolvedTheme === 'midnight' ? 'bg-[#101f30] border-[#1e3a5f]' : 'bg-zinc-300 border-zinc-400'
      }`}>
        <div className="flex items-center justify-between min-w-0">
          <span className={`font-mono font-bold whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-[9px]'} ${
            resolvedTheme === 'dark' ? 'text-[#B8FF3F]/70' : 
            resolvedTheme === 'bit' ? 'text-[#ff00ff]' : 
            resolvedTheme === 'midnight' ? 'text-[#94a3b8]' : 'text-zinc-600'
          }`}>
            {resolvedTheme === 'bit' ? `STREAMS_TOTAL: ${streams.length}` : `إجمالي البثوث: ${streams.length}`}
          </span>
          {isLoadingPlaylists && (
            <span className={`animate-pulse font-mono whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-[9px]'} ${
              resolvedTheme === 'dark' ? 'text-zinc-500' : 
              resolvedTheme === 'bit' ? 'text-[#00ffff]' : 
              resolvedTheme === 'midnight' ? 'text-[#3b82f6]' : 'text-zinc-500'
            }`}>
              {resolvedTheme === 'bit' ? '⏳ LOADING M3U...' : '⏳ جاري تحميل القوائم...'}
            </span>
          )}
          {isHealthChecking && (
            <span className={`animate-pulse font-mono opacity-60 ${isMobile ? 'text-[10px]' : 'text-[9px]'}`}>
              🔍 fحص الجودة...
            </span>
          )}
        </div>
        
        <div className="flex gap-1.5 w-full">
          {/* Lucky Dip Button */}
          <button
            onClick={playRandomStream}
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
            title="بث عشوائي (نرد الحظ)"
            className={`flex-1 flex items-center justify-center gap-1 text-[9px] font-mono font-bold py-1 px-1.5 border shadow-sm rounded transition-all cursor-pointer ${
              isMobile ? 'text-xs' : ''
            } ${
              resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-[#333] text-[#B8FF3F] border-[#1d1d1d]' : 
              resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 text-[#ff00ff] border-[#ff00ff]' : 
              resolvedTheme === 'midnight' ? 'bg-[#1e3a5f] hover:bg-[#2563eb] text-white border-[#2563eb]' : 
              'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-sans'
            }`}
          >
            <span>🎲</span>
            <span>{resolvedTheme === 'bit' ? 'DICE' : 'الحظ'}</span>
          </button>

          {/* Alphabetical Sort button */}
          <button
            onClick={handleSortAlphabetically}
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
            disabled={isSorting || streams.length === 0}
            title="ترتيب أبجدي بالأحرف والأرقام"
            className={`flex-1 flex items-center justify-center gap-1.5 text-[9px] font-mono font-bold py-1 px-1.5 border shadow-sm rounded transition-all cursor-pointer disabled:opacity-50 ${
              isMobile ? 'text-xs' : ''
            } ${
              resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-[#333] text-[#B8FF3F] border-[#1d1d1d]' : 
              resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 text-[#00ffff] border-[#ff00ff]' : 
              resolvedTheme === 'midnight' ? 'bg-[#1e3a5f] hover:bg-[#101f30] text-sky-400 border-[#1e3a5f]' : 
              'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 font-sans'
            }`}
          >
            <SortAsc className="w-3.5 h-3.5 text-sky-500" />
            <span>{resolvedTheme === 'bit' ? 'SORT A-Z' : 'ترتيب أبجدي'}</span>
          </button>

          {/* New stream button */}
          <button
            onClick={handleOpenAdd}
            style={{ minHeight: isMobile ? '44px' : 'auto' }}
            className={`flex-1 flex items-center justify-center gap-1 text-[9px] font-mono font-bold py-1 px-1.5 border shadow-sm rounded transition-all cursor-pointer ${
              isMobile ? 'text-xs' : ''
            } ${
              resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-[#333] text-[#B8FF3F] border-[#1d1d1d]' : 
              resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 text-[#00ffff] border-[#ff00ff]' : 
              resolvedTheme === 'midnight' ? 'bg-[#1e3a5f] hover:bg-[#2563eb] text-white border-[#2563eb]' : 
              'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-950 font-sans'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{resolvedTheme === 'bit' ? 'ADD' : 'إضافة'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 select-none" id="retro-tv-section">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 150ms ease-out forwards;
        }
      `}</style>
      {!isTvOpen ? (
        // Closed State - Retro On Switch
        <div 
          onClick={() => setIsTvOpen(true)} 
          className="cursor-pointer transition-all duration-300 hover:scale-105 mx-auto max-w-sm"
        >
          {resolvedTheme === 'light' ? (
            <OsWindow title={skin.closedTitle} style={{ maxWidth: 320, margin: '0 auto' }}>
              {closedInnerContent}
            </OsWindow>
          ) : (
            <div 
              className="rounded overflow-hidden"
              style={{
                maxWidth: 320,
                margin: '0 auto',
                backgroundColor: skin.outerBg,
                border: skin.borderStyle,
                boxShadow: resolvedTheme === 'bit' ? '0 0 0 2px #ff00ff, 0 0 0 4px #00ffff, 0 0 0 6px #ff00ff' : '0 10px 25px -5px rgba(0,0,0,0.5)',
                imageRendering: resolvedTheme === 'bit' ? 'pixelated' : 'auto'
              }}
            >
              <div className={`px-3 py-1.5 text-[10px] font-bold flex items-center justify-between border-b ${
                resolvedTheme === 'dark' ? 'bg-[#111] text-[#B8FF3F] border-[#1f1f1f]' : 
                resolvedTheme === 'bit' ? 'bg-[#2d1b69] text-[#ff00ff] border-[#ff00ff]' : 
                'bg-[#101f30] text-[#60a5fa] border-[#1e3a5f]'
              }`}>
                <span>{skin.closedTitle}</span>
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    resolvedTheme === 'dark' ? 'bg-[#FF453A]' : 
                    resolvedTheme === 'bit' ? 'bg-[#ff00ff]' : 'bg-[#1e3a5f]'
                  }`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    resolvedTheme === 'dark' ? 'bg-[#FFD60A]' : 
                    resolvedTheme === 'bit' ? 'bg-[#00ffff]' : 'bg-[#2563eb]'
                  }`} />
                </div>
              </div>
              {closedInnerContent}
            </div>
          )}
        </div>
      ) : (
        // Open Active System Layout
        <div
          ref={playerWrapperRef}
          className={`${resolvedTheme === 'dark' ? 'font-mono' : ''} flex flex-col w-full relative select-none rounded overflow-hidden`}
          style={{
            height: isMobile ? 'auto' : (isFullscreen ? '100dvh' : '520px'),
            minHeight: isMobile ? '100dvh' : undefined,
            backgroundColor: skin.outerBg,
            border: resolvedTheme === 'light' ? '2px solid rgba(0,0,0,0)' : 
                    resolvedTheme === 'bit' && isMobile ? 'none' : skin.borderStyle,
            outline: resolvedTheme === 'bit' && isMobile ? '2px solid #ff00ff' : 'none',
            borderColor: resolvedTheme === 'light' ? '#FFF #999 #999 #FFF' : undefined,
            boxShadow: resolvedTheme === 'light' ? (isMobile ? '2px 2px 0 #444, 3px 3px 0 rgba(0,0,0,0.15)' : '4px 4px 0 #444, 8px 8px 0 rgba(0,0,0,0.15)') :
                       resolvedTheme === 'bit' ? (isMobile ? '0 0 3px #ff00ff' : '0 0 0 2px #ff00ff, 0 0 0 4px #00ffff, 0 0 0 6px #ff00ff') : 
                       resolvedTheme === 'dark' ? '0 10px 30px rgba(0,0,0,1)' : '0 10px 30px rgba(12,25,41,0.5)',
            imageRendering: resolvedTheme === 'bit' ? 'pixelated' : 'auto',
            position: isFullscreen ? 'fixed' : 'relative',
            inset: isFullscreen ? 0 : 'auto',
            zIndex: isFullscreen ? 50 : 'auto'
          }}
        >
          {/* Classic Window Top Menu Header */}
          <div className={`bg-gradient-to-r ${skin.headerGradient} border-b ${resolvedTheme === 'midnight' ? 'border-[#1e3a5f]' : resolvedTheme === 'bit' ? 'border-[#ff00ff]' : resolvedTheme === 'dark' ? 'border-[#1f1f1f]' : 'border-zinc-600'} ${isMobile ? 'h-9 sticky top-0 z-40' : 'h-8'} flex items-center justify-between px-3 text-white flex-shrink-0`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-[#FF453A]' : 'bg-red-500'} ${resolvedTheme === 'bit' ? 'border border-[#ff00ff]' : 'border border-red-600 shadow-inner'}`} />
              <div className={`w-2.5 h-2.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-[#FFD60A]' : 'bg-yellow-400'} ${resolvedTheme === 'bit' ? 'border border-[#ff00ff]' : 'border border-yellow-500 shadow-inner'}`} />
              <div className={`w-2.5 h-2.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-[#B8FF3F]' : 'bg-green-500'} ${resolvedTheme === 'bit' ? 'border border-[#00ffff]' : 'border border-green-600 shadow-inner'}`} />
            </div>
 
            <div className={`flex items-center gap-2 font-mono text-xs font-bold leading-none ${
              resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : 
              resolvedTheme === 'bit' ? 'text-[#00ffff] uppercase' : 
              resolvedTheme === 'midnight' ? 'text-white' : 'text-zinc-100'
            } ${isMobile ? 'max-w-[60%] text-[10px]' : ''}`}>
              {activeCategory === 'radio' && <Radio className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
              {activeCategory === 'music_channels' && <Tv className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
              <span className={isMobile ? 'truncate' : ''}>
                {activeStream ? (resolvedTheme === 'bit' ? activeStream.name.toUpperCase() : activeStream.name) : (resolvedTheme === 'bit' ? 'QAI_TV: NO CHANNELS' : 'قائمة فارغة - أضف بثك الآن')}
              </span>
            </div>
 
            <div className="flex items-center gap-1">
              <button 
                onClick={handleResetToPresets}
                title="إعادة ضبط المصنع"
                className={`font-mono border shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] rounded flex items-center justify-center ${
                  isMobile ? 'text-xs px-2.5 py-1 min-w-[36px] min-h-[36px]' : 'text-[10px] px-1.5 py-0.5'
                } ${
                  resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-[#333] text-[#B8FF3F] border-[#1d1d1d]' : 
                  resolvedTheme === 'bit' ? 'bg-[#2d1b69] hover:bg-[#120b25] text-[#ffff00] border-[#ff00ff]' : 
                  resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-[#162237] text-[#60a5fa] border-[#1e3a5f]' : 
                  'bg-zinc-600 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setIsTvOpen(false)}
                className={`font-mono border shadow-[inset_1px_1px_0_rgba(255,255,255,0.2)] rounded cursor-pointer flex items-center justify-center ${
                  isMobile ? 'text-xs px-3 py-1 min-w-[36px] min-h-[36px]' : 'text-xs px-2 py-0.5'
                } ${
                  resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-red-700 text-[#B8FF3F] text-[#B8FF3F] border-[#1d1d1d]' : 
                  resolvedTheme === 'bit' ? 'bg-[#2d1b69] hover:bg-red-700 text-[#ff00ff] border-[#ff00ff]' : 
                  resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-red-700 text-white border-[#1e3a5f]' : 
                  'bg-zinc-600 hover:bg-red-700 text-white border-zinc-800'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
 
          <div 
            style={{
              height: isMobile ? 'auto' : (isFullscreen ? '100dvh' : '520px'),
              minHeight: isMobile ? '100dvh' : undefined,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
            }}
            className="flex-1 overflow-hidden"
          >
            {/* LEFT PLAYER VIEWPORT SCREEN PANEL */}
            <div className={`flex flex-col bg-black relative min-w-0 ${isMobile ? 'w-full h-auto' : 'flex-1'}`}>
              <div 
                className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950"
              >
                {/* Standard Progressive/HLS Video Player */}
                <video
                  ref={videoRef}
                  muted={isMuted}
                  playsInline
                  autoPlay
                  className="w-full h-full object-contain"
                  style={{
                    display: activeCategory === 'music_channels' ? 'block' : 'none',
                    filter: 'none'
                  }}
                />

                {/* PREMIUM RETRO CASSETTE INTERFACES FOR RADIO & MUSIC CATEGORIES */}
                {(activeCategory === 'radio' || activeCategory === 'music_audio') && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${
                    resolvedTheme === 'dark' ? 'bg-[#050505]' : 
                    resolvedTheme === 'bit' ? 'bg-[#120b25]' : 
                    resolvedTheme === 'midnight' ? 'bg-[#040a12]' : 'bg-zinc-950'
                  }`}>
                    {/* Bouncing Retro Scanlines Overlay */}
                    {skin.scanlines && (
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-[length:100%_4px] pointer-events-none z-10 animate-pulse" />
                    )}
                    
                    {/* Animated Rotating Tape Deck Speaker Box */}
                    <div 
                      className={`rounded-xl p-4 w-72 h-44 flex flex-col justify-between shadow-2xl relative ${
                        resolvedTheme === 'dark' ? 'bg-[#121212] border-2 border-[#1f1f1f]' : 
                        resolvedTheme === 'bit' ? 'bg-[#1a1032] border-3 border-[#ff00ff]' : 
                        resolvedTheme === 'midnight' ? 'bg-[#101f30] border border-[#1e3a5f]' : 'bg-zinc-900 border-4 border-zinc-800'
                      }`}
                      style={{
                        boxShadow: resolvedTheme === 'bit' ? '0 0 0 2.5px #00ffff' : 'none'
                      }}
                    >
                      <div className={`h-10 rounded-lg flex items-center justify-between px-3 text-[10px] font-mono font-bold border shadow-inner ${
                        resolvedTheme === 'dark' ? 'bg-[#050505] text-[#B8FF3F] border-[#1f1f1f]' : 
                        resolvedTheme === 'bit' ? 'bg-[#2d1b69] text-[#00ffff] border-[#00ffff] uppercase' : 
                        resolvedTheme === 'midnight' ? 'bg-[#0c1929] text-[#60a5fa] border-[#1e3a5f]' : 'bg-gradient-to-r from-yellow-500 to-orange-400 text-zinc-950 border-zinc-950'
                      }`}>
                        <div className="truncate pr-2">
                          {activeCategory === 'radio' ? '📻' : '🎵'} {activeStream?.name || (activeCategory === 'radio' ? 'Radio Broadcast' : 'Music Stream')}
                        </div>
                        <div className="flex-shrink-0">
                          {elapsedSeconds > 0 ? (
                            <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${
                              resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : 
                              resolvedTheme === 'bit' ? 'text-[#00ffff]' : 
                              resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'text-emerald-900 font-bold'
                            }`}>
                              🎙 {formatElapsed(elapsedSeconds)}
                            </span>
                          ) : (
                            <span className={`animate-pulse px-1.5 py-0.5 rounded text-[8px] tracking-wide ${
                              resolvedTheme === 'dark' ? 'bg-[#B8FF3F]/20 text-[#B8FF3F]' : 
                              resolvedTheme === 'bit' ? 'bg-[#ff00ff] text-white' : 
                              resolvedTheme === 'midnight' ? 'bg-[#3b82f6]/20 text-[#60a5fa]' : 'bg-emerald-700 text-white'
                            }`}>
                              {resolvedTheme === 'bit' ? 'LIVE' : 'ONLINE'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Spinning audio tape spools */}
                      <div className="flex justify-around items-center py-2 relative z-10">
                        <div className="relative">
                          <div 
                            className={`w-14 h-14 rounded-full border-4 border-dashed flex items-center justify-center ${
                              resolvedTheme === 'dark' ? 'border-[#333] bg-[#050505]' : 
                              resolvedTheme === 'bit' ? 'border-[#ff00ff] bg-[#120b25]' : 
                              resolvedTheme === 'midnight' ? 'border-[#1e3a5f] bg-[#080f1a]' : 'border-zinc-400 bg-zinc-950'
                            } ${
                              isPlaying ? 'animate-spin' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full ${resolvedTheme === 'dark' ? 'bg-zinc-800' : resolvedTheme === 'bit' ? 'bg-[#ff00ff]' : resolvedTheme === 'midnight' ? 'bg-[#1e3a5f]' : 'bg-zinc-200'}`} />
                          </div>
                        </div>

                        {/* Cassette Center window */}
                        <div className={`w-16 h-8 border-2 rounded flex items-center justify-around px-1 overflow-hidden ${
                          resolvedTheme === 'dark' ? 'border-[#1f1f1f] bg-[#050505]' : 
                          resolvedTheme === 'bit' ? 'border-[#ff00ff] bg-[#120b25]' : 
                          resolvedTheme === 'midnight' ? 'border-[#1e3a5f] bg-[#080f1a]' : 'border-zinc-800 bg-zinc-950'
                        }`}>
                          <div className={`w-0.5 h-6 rounded transition-transform ${resolvedTheme === 'bit' ? 'bg-[#00ffff]' : 'bg-red-600'} ${isPlaying ? 'scale-y-125' : 'scale-y-50'}`} />
                          <div className={`w-0.5 h-6 rounded transition-transform ${resolvedTheme === 'bit' ? 'bg-[#00ffff]' : 'bg-red-600'} ${isPlaying ? 'scale-y-75' : 'scale-y-50'}`} />
                        </div>

                        <div className="relative">
                          <div 
                            className={`w-14 h-14 rounded-full border-4 border-dashed flex items-center justify-center ${
                              resolvedTheme === 'dark' ? 'border-[#333] bg-[#050505]' : 
                              resolvedTheme === 'bit' ? 'border-[#ff00ff] bg-[#120b25]' : 
                              resolvedTheme === 'midnight' ? 'border-[#1e3a5f] bg-[#080f1a]' : 'border-zinc-400 bg-zinc-950'
                            } ${
                              isPlaying ? 'animate-spin' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full ${resolvedTheme === 'dark' ? 'bg-zinc-800' : resolvedTheme === 'bit' ? 'bg-[#ff00ff]' : resolvedTheme === 'midnight' ? 'bg-[#1e3a5f]' : 'bg-zinc-200'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Equalizer levels container */}
                      <div className="flex justify-between items-end h-5 px-4 gap-0.5">
                        {[4, 8, 2, 7, 5, 10, 3, 9, 6, 8, 2, 5, 7, 4, 9, 3].map((height, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm"
                            style={{
                              height: isPlaying ? `${Math.floor(Math.random() * 100)}%` : `${height * 10}%`,
                              backgroundColor: resolvedTheme === 'dark' ? '#B8FF3F' : 
                                               resolvedTheme === 'bit' ? (i % 2 === 0 ? '#ff00ff' : '#00ffff') : 
                                               resolvedTheme === 'midnight' ? '#60a5fa' : 
                                               (i % 2 === 0 ? '#10B981' : '#F59E0B')
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className={`text-[10px] font-mono mt-3 uppercase tracking-widest text-center ${
                      resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : 
                      resolvedTheme === 'bit' ? 'text-[#ff00ff]' : 
                      resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-400'
                    }`}>
                      {isPlaying ? (
                        activeCategory === 'radio' 
                          ? (resolvedTheme === 'bit' ? 'PLAYING RADIO-BROADCAST' : 'Playing Radio • البث الإذاعي قيد التشغيل')
                          : (resolvedTheme === 'bit' ? 'PLAYING MUSIC-TRACK' : 'Playing Music • البث الموسيقي قيد التشغيل')
                      ) : (
                        activeCategory === 'radio'
                          ? (resolvedTheme === 'bit' ? 'RADIO TUNED' : 'Radio Tuned • الراديو جاهز')
                          : (resolvedTheme === 'bit' ? 'DECK LOADED' : 'Deck Loaded • الموسيقى جاهزة')
                      )}
                    </div>
                  </div>
                )}

                {/* CRT Scan line visual screen overlays */}
                {activeCategory !== 'music_channels' && (
                  <div 
                    className="absolute inset-0 pointer-events-none select-none z-20"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%)',
                      backgroundSize: '100% 4px',
                      backgroundColor: skin.scanlines && resolvedTheme === 'dark' ? 'rgba(184,255,63,0.03)' : 
                                       skin.scanlines && resolvedTheme === 'bit' ? 'rgba(255,0,255,0.03)' : 'transparent'
                    }}
                  />
                )}

                {/* Live Banner Overlay */}
                {!isLoading && !errorMsg && (
                  <div className="absolute top-2.5 left-2.5 bg-red-700 text-white font-mono text-[9px] px-2 py-0.5 font-bold border border-red-900 shadow-md tracking-wider flex items-center gap-1 z-30">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>🔴 ON AIR</span>
                  </div>
                )}

                {/* Loading Broadcast indicator */}
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10">
                    <div className="absolute inset-0 bg-zinc-950/40 repeating-linear-gradient opacity-60 animate-pulse" />
                    <div className="z-10 text-center text-white font-mono flex flex-col items-center gap-3">
                      <div className="text-4xl animate-spin">⏳</div>
                      <div className="text-xs tracking-wider">جاري ضبط الإشارة والتوصيل...</div>
                      <div className="text-[10px] text-zinc-400 max-w-[200px] truncate">{activeStream?.name}</div>
                    </div>
                  </div>
                )}

                {/* Stream Error screen overlay */}
                {errorType ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10 p-4 border-2 border-red-800">
                    <div className="text-center text-white font-mono flex flex-col items-center gap-2">
                      <span className="text-4xl">{getErrorDisplay(errorType, activeStream?.name || '').icon}</span>
                      <div className="text-xs text-red-500 font-bold">{getErrorDisplay(errorType, activeStream?.name || '').title}</div>
                      <p className="text-[10px] text-zinc-400 max-w-xs">{getErrorDisplay(errorType, activeStream?.name || '').subtitle}</p>
                      
                      <div className="flex gap-2 mt-3 flex-wrap justify-center">
                        {getErrorDisplay(errorType, activeStream?.name || '').canRetry && (
                          <button 
                            onClick={() => activeStream && playCurrentStream(activeStream)}
                            className="bg-zinc-800 text-[10px] hover:bg-zinc-700 text-white font-mono px-3 py-1 border border-zinc-600 rounded shadow cursor-pointer transition-colors"
                          >
                            إعادة المحاولة (Retry)
                          </button>
                        )}
                        
                        {errorType === 'CORS_BLOCKED' && activeStream && (
                          <button 
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(activeStream.url);
                                setCopySuccess(true);
                                setTimeout(() => setCopySuccess(false), 2000);
                              } catch (err) {
                                console.error('Failed to copy', err);
                              }
                            }}
                            className={`text-[10px] font-mono px-3 py-1 border rounded shadow cursor-pointer transition-colors ${
                              copySuccess 
                                ? 'bg-emerald-800 border-emerald-600 text-white' 
                                : 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white font-sans'
                            }`}
                          >
                            {copySuccess ? '✔️ تم النسخ!' : '📋 نسخ الرابط للمشغّل الخارجي'}
                          </button>
                        )}

                        <button 
                          onClick={playNextStream}
                          className="bg-zinc-800 text-[10px] hover:bg-zinc-700 text-white font-mono px-3 py-1 border border-zinc-600 rounded shadow cursor-pointer transition-colors font-sans"
                        >
                          القناة التالية ➡️
                        </button>
                      </div>
                    </div>
                  </div>
                ) : errorMsg ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10 p-4 border-2 border-red-800">
                    <div className="text-center text-white font-mono flex flex-col items-center gap-2">
                      <span className="text-4xl">📡</span>
                      <div className="text-xs text-red-500 font-bold">لا توجد إشارة / انقطع البث</div>
                      <p className="text-[10px] text-zinc-400 max-w-xs">{errorMsg}</p>
                      <button 
                        onClick={() => activeStream && playCurrentStream(activeStream)}
                        className="mt-3 bg-zinc-800 text-[10px] hover:bg-zinc-700 text-white font-mono px-3 py-1 border border-zinc-600 rounded shadow"
                      >
                        إعادة المحاولة (Retry)
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Lower Deck: Hardware console sliders */}
              <div 
                className={`py-1.5 px-3 flex items-center gap-3 flex-shrink-0 z-30 font-mono text-xs border-t ${
                  isMobile ? 'flex-nowrap overflow-x-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' : 'flex-wrap'
                } ${
                  resolvedTheme === 'dark' ? 'bg-[#0d0d0d] text-zinc-400 border-[#1f1f1f]' : 
                  resolvedTheme === 'bit' ? 'bg-[#2d1b69] text-[#ff00ff] border-[#ff00ff] uppercase' : 
                  resolvedTheme === 'midnight' ? 'bg-[#0c1929] text-[#94a3b8] border-[#1e3a5f]' : 'bg-[#C0C0C0] text-zinc-950 border-zinc-400'
                }`}
              >
                {/* Micro-Controls */}
                <button 
                  onClick={handleTogglePlayback}
                  style={resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {}}
                  className={`px-2 py-1 rounded text-[10px] flex items-center justify-center border transition-all ${
                    resolvedTheme === 'dark' ? 'bg-[#151515] hover:bg-[#222] border-[#333] text-[#B8FF3F]' : 
                    resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 border-[#00ffff] text-[#00ffff]' : 
                    resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
                    'bg-zinc-300 hover:bg-zinc-400 active:bg-zinc-500 border-zinc-400 text-zinc-950'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                <button 
                  onClick={handleToggleMute}
                  style={resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {}}
                  className={`px-2 py-1 rounded text-[10px] flex items-center justify-center gap-1 border transition-all ${
                    resolvedTheme === 'dark' ? 'bg-[#151515] hover:bg-[#222] border-[#333] text-[#B8FF3F]' : 
                    resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 border-[#00ffff] text-[#00ffff]' : 
                    resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
                    'bg-zinc-300 hover:bg-zinc-400 active:bg-zinc-500 border-zinc-400 text-zinc-950'
                  }`}
                >
                  {isMuted ? <VolumeX className={`w-3.5 h-3.5 ${resolvedTheme === 'bit' ? 'text-[#ff00ff]' : 'text-red-700'}`} /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Volume Lever */}
                <div className="flex items-center gap-1.5 min-w-[100px] max-w-[140px] flex-1">
                  <span className={`text-[10px] font-bold ${
                    resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : 
                    resolvedTheme === 'bit' ? 'text-[#ff00ff]' : 
                    resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'opacity-70'
                  }`}>VOL</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className={`w-full cursor-pointer h-2 bg-zinc-400 outline-none rounded-lg appearance-none accent-blue-900 ${
                      resolvedTheme === 'dark' ? 'accent-[#B8FF3F] bg-zinc-800' : 
                      resolvedTheme === 'bit' ? 'accent-[#ff00ff] bg-[#120b25]' : 
                      resolvedTheme === 'midnight' ? 'accent-[#3b82f6] bg-[#080f1a]' : ''
                    }`}
                  />
                </div>

                {/* Backup Qualities failover support indicator */}
                {activeStream && activeStream.qualities.length > 1 && (
                  <button
                    onClick={() => {
                      const nextQIdx = (activeStream.currentQualityIndex + 1) % activeStream.qualities.length;
                      setActiveStream({
                        ...activeStream,
                        currentQualityIndex: nextQIdx,
                      });
                    }}
                    style={resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {}}
                    className={`font-bold border px-2.5 py-1 rounded text-[10px] transition-all ${
                      resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-[#333] border-[#333] text-[#B8FF3F]' : 
                      resolvedTheme === 'bit' ? 'bg-[#ff00ff]/20 hover:bg-[#ff00ff]/40 border-[#ff00ff] text-[#ffff00]' : 
                      resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
                      'bg-blue-800 hover:bg-blue-950 text-white border-blue-900'
                    }`}
                  >
                    ⚙️ {activeStream.qualities[activeStream.currentQualityIndex].quality}
                  </button>
                )}

                {/* Status Readout Screen */}
                <div className={`flex-1 text-center truncate text-[10px] px-2 font-mono h-6 flex items-center justify-center border rounded ${
                  resolvedTheme === 'dark' ? 'bg-black text-[#B8FF3F] border-[#1f1f1f]' : 
                  resolvedTheme === 'bit' ? 'bg-[#120b25] text-[#ffff00] border-[#00ffff]' : 
                  resolvedTheme === 'midnight' ? 'bg-[#040a12] text-[#60a5fa] border-[#1e3a5f]' : 
                  'bg-black text-[#00FF00] border-zinc-400'
                }`}>
                  {activeStream ? (
                    activeCategory === 'radio' && elapsedSeconds > 0 ? (
                      `${resolvedTheme === 'bit' ? activeStream.name.toUpperCase() : activeStream.name} — ${formatElapsed(elapsedSeconds)}`
                    ) : (
                      resolvedTheme === 'bit' ? activeStream.name.toUpperCase() : activeStream.name
                    )
                  ) : 'NO_STREAM'}
                </div>

                {/* Rightmost Utility buttons */}
                <button 
                  onClick={toggleFullscreen}
                  style={resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0 #FFF, inset -1px -1px 0 #666' } : {}}
                  className={`px-2 py-1 rounded text-[10px] flex items-center justify-center border transition-all ${
                    resolvedTheme === 'dark' ? 'bg-[#151515] hover:bg-[#222] border-[#333] text-[#B8FF3F]' : 
                    resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 border-[#00ffff] text-[#00ffff]' : 
                    resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-[#1e3a5f] border-[#1e3a5f] text-[#60a5fa]' : 
                    'bg-zinc-300 hover:bg-zinc-400 active:bg-zinc-500 border border-zinc-400 text-zinc-950'
                  }`}
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* THREE-TAB SIDEBAR LAYOUT & MOBILE COMPLEMENT STACK */}
            {isMobile && (
              <>
                {renderTabSwitcher()}
                {renderSearchBar()}
                {renderSubGroups()}
                {renderStreamList()}
                {renderBottomStatsAndActions()}
              </>
            )}

            {!isMobile && isSidebarOpen && !isFullscreen && (
              <div 
                className={`w-60 flex-shrink-0 flex flex-col h-full overflow-hidden border-l ${skin.sidebarBg} ${
                  resolvedTheme === 'dark' ? 'border-[#1f1f1f]' : 
                  resolvedTheme === 'bit' ? 'border-[#ff00ff]' : 
                  resolvedTheme === 'midnight' ? 'border-[#1e3a5f]' : 'border-zinc-400'
                }`}
              >
                {renderTabSwitcher()}
                {renderSearchBar()}
                {renderStreamList()}
                {renderSubGroups()}
                {renderBottomStatsAndActions()}
              </div>
            )}
          </div>

          {/* Tooltip Overlay above the footer bar */}
          {showKeyHints && !isFullscreen && (
            <div 
              style={{
                direction: 'rtl',
                border: resolvedTheme === 'dark' ? '1px solid #1f1f1f' : 
                        resolvedTheme === 'bit' ? '1px solid #ff00ff' : 
                        resolvedTheme === 'midnight' ? '1px solid #1e3a5f' : '1px solid #a1a1aa',
                boxShadow: resolvedTheme === 'bit' ? '0 0 10px #ff00ff' : '0 4px 15px rgba(0,0,0,0.3)',
              }}
              className={`absolute bottom-6 left-2 right-2 z-40 p-2 rounded text-[10px] font-mono select-none text-center ${
                resolvedTheme === 'dark' ? 'bg-[#0d0d0d]/95 text-zinc-300' : 
                resolvedTheme === 'bit' ? 'bg-[#120b25]/95 text-[#00ffff]' : 
                resolvedTheme === 'midnight' ? 'bg-[#0c1929]/95 text-[#94a3b8]' : 'bg-zinc-100/95 text-zinc-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span className="font-bold underline">🎹 الاختصارات:</span>
                <span>↑↓ قنوات التالية/السابقة</span>
                <span>|</span>
                <span>Space تشغيل/إيقاف</span>
                <span>|</span>
                <span>M كتم الصّوت</span>
                <span>|</span>
                <span>F شاشة كاملة</span>
                <span>|</span>
                <span>1/2 الأقسام</span>
              </div>
            </div>
          )}

          {/* Footer bar indicator */}
          {!isFullscreen && (
            <div className={`h-6 px-3 flex items-center justify-between font-mono text-[10px] flex-shrink-0 border-t ${
              resolvedTheme === 'dark' ? 'bg-[#0d0d0d] text-zinc-400 border-[#1f1f1f]' : 
              resolvedTheme === 'bit' ? 'bg-[#2d1b69] text-[#ff00ff] border-[#ff00ff]' : 
              resolvedTheme === 'midnight' ? 'bg-[#0c1929] text-[#94a3b8] border-[#1e3a5f]' : 'bg-zinc-300 border-zinc-400 text-zinc-800'
            }`}>
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <span className={`animate-pulse inline-block w-2 h-2 rounded-full ${
                  resolvedTheme === 'bit' ? 'bg-[#0ff] shadow-[0_0_8px_#0ff]' : 'bg-emerald-600'
                }`} />
                <span>
                  {resolvedTheme === 'bit' ? 'RETRO BROADCAST ENGINE ONLINE' : 'منصة البث الكلاسيكية جاهزة ومتصلة • Classic Broadcast Server is LIVE'}
                </span>
                <button
                  title="اختصارات لوحة المفاتيح"
                  className="text-[9px] font-mono opacity-50 hover:opacity-100 ml-2 bg-transparent border-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowKeyHints(p => !p);
                  }}
                >
                  ⌨️
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(p => !p)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                    resolvedTheme === 'dark' ? 'bg-[#222] hover:bg-[#333] text-[#B8FF3F] border-[#1d1d1d]' : 
                    resolvedTheme === 'bit' ? 'bg-[#120b25] hover:bg-[#ff00ff]/20 text-[#00ffff] border-[#ff00ff]' : 
                    resolvedTheme === 'midnight' ? 'bg-[#101f30] hover:bg-[#162237] text-white border-[#1e3a5f]' : 
                    'bg-zinc-400 hover:bg-zinc-500 text-zinc-800 border-zinc-500'
                  }`}
                >
                  {isSidebarOpen ? (resolvedTheme === 'bit' ? 'HIDE_LIST' : 'إخفاء اللائحة') : (resolvedTheme === 'bit' ? 'SHOW_LIST' : 'عرض اللائحة')}
                </button>
                <div className="text-[10px] text-zinc-500 font-mono">
                  RETRO_DECK V3.2
                </div>
              </div>
            </div>
          )}

          {/* RETRO WINDOWS DYNAMIC FORM POPUP PANEL MODAL */}
          {isModalOpen && (
            <div className="absolute inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm">
                <OsWindow title={modalMode === 'add' ? 'add_new_channel.deb' : 'edit_selected_stream.deb'}>
                  <form onSubmit={handleSaveStream} className="p-4 font-sans text-xs flex flex-col gap-3 font-mono">
                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-700 font-bold">اسم القناة أو البث * (Title)</label>
                      <input
                        type="text"
                        required
                        dir="auto"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="أدخل اسم البث (مثال: الجزيرة الإخبارية)"
                        className="p-1.5 border-2 border-zinc-500 bg-white text-black outline-none w-full text-xs font-sans"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-700 font-bold">رابط البث * (Stream URL / Backup Links)</label>
                      <textarea
                        required
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        rows={3}
                        placeholder="رابط .m3u8 أو .mp4 أو .mp3 أو راديو. افصل بفواصل (,) لإضافة جودات وروابط احتياطية."
                        className="p-1.5 border-2 border-zinc-500 bg-white text-black outline-none w-full text-[10px] font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-zinc-700 font-bold">التصنيف الرئيسي (Category)</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as any)}
                          className="p-1.5 border-2 border-zinc-500 bg-white text-zinc-950 font-bold outline-none w-full text-xs font-mono"
                        >
                          <option value="music_channels">📺 قنوات ومجموعة</option>
                          <option value="radio">📻 راديو ومحطات</option>
                          <option value="music_audio">🎵 موسيقى وتراكات</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-zinc-700 font-bold">المجموعة أو الدولة (Group)</label>
                        <input
                          type="text"
                          value={formGroup}
                          onChange={(e) => setFormGroup(e.target.value)}
                          placeholder="مثال: Morocco, News"
                          className="p-1.5 border-2 border-zinc-500 bg-white text-black outline-none w-full text-xs font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-zinc-700 font-bold">رابط الشعار - اختياري (Logo URL)</label>
                      <input
                        type="url"
                        value={formLogo}
                        onChange={(e) => setFormLogo(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="p-1.5 border-2 border-zinc-500 bg-white text-black outline-none w-full text-xs font-mono"
                      />
                    </div>

                    <div className="text-[10px] text-zinc-500 border-t border-zinc-300 pt-2 leading-relaxed">
                      💡 يدعم النظام جودات متعددة تلقائياً عند الفصل بين الروابط بفواصل، ويدعم البث التلفزيوني الحي (HLS) والراديو المباشر (Icecast) والأفلام المخزنة (Progressive MP4) بنسبة أمان فائقة.
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="bg-zinc-300 hover:bg-zinc-400 text-zinc-950 px-4 py-1.5 border border-zinc-500 rounded text-xs cursor-pointer shadow-[1px_1px_0_#FFF]"
                      >
                        إلغاء الأمر
                      </button>
                      
                      <button
                        type="submit"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-1.5 border border-emerald-950 rounded text-xs cursor-pointer shadow-[1px_1px_0_rgba(255,255,255,0.2)] font-bold"
                      >
                        {modalMode === 'add' ? 'إضافة البث' : 'تطبيق التعديل'}
                      </button>
                    </div>
                  </form>
                </OsWindow>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IptvSection;
