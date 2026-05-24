// src/components/sections/IptvSection.tsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tv, Plus, RotateCcw, SortAsc, RefreshCw } from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { audioManager } from '../../audio/audioManager';
import { STREAM_SOURCES } from '../../config/streams';
import type { StreamItem, StreamCategory } from './iptv/types';
import { useStreamPlayer } from './iptv/useStreamPlayer';
import { StreamSearch } from './iptv/StreamSearch';
import { StreamList } from './iptv/StreamList';
import { StreamPlayer } from './iptv/StreamPlayer';
import {
  DEFAULT_PRESET_STREAMS,
  parseM3U,
  sortSubGroupChips,
  THEME_SKIN,
} from './iptv/helpers';
import { useDeviceType } from '../../hooks/useDeviceType';

const LS_PLAYLIST = 'retro_tv_custom_playlist';
const LS_FETCH_TS = 'retro_tv_last_fetch';
const CACHE_TTL   = 86_400_000; // 24 ساعة

function loadCachedStreams(): StreamItem[] | null {
  try {
    const ts   = localStorage.getItem(LS_FETCH_TS);
    const data = localStorage.getItem(LS_PLAYLIST);
    if (!ts || !data) return null;
    if (Date.now() - parseInt(ts) > CACHE_TTL) return null;
    const parsed = JSON.parse(data) as StreamItem[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function saveCache(list: StreamItem[]) {
  try {
    localStorage.setItem(LS_PLAYLIST, JSON.stringify(list));
    localStorage.setItem(LS_FETCH_TS, Date.now().toString());
  } catch {}
}

function clearCache() {
  localStorage.removeItem(LS_PLAYLIST);
  localStorage.removeItem(LS_FETCH_TS);
}

// ── Component ──────────────────────────────────────────────────
export function IptvSection() {
  const resolvedTheme = useResolvedTheme();
  const { isMobile }  = useDeviceType();
  const skin = THEME_SKIN[resolvedTheme as keyof typeof THEME_SKIN] ?? THEME_SKIN.light;

  // ── UI State
  const [isTvOpen,       setIsTvOpen]       = useState(false);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(true);
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [modalMode,      setModalMode]      = useState<'add' | 'edit'>('add');
  const [editId,         setEditId]         = useState<string | null>(null);

  // ── Stream State
  const [streams,        setStreams]         = useState<StreamItem[]>(DEFAULT_PRESET_STREAMS);
  const [isLoadingM3U,   setIsLoadingM3U]   = useState(false);
  const [fetchError,     setFetchError]     = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<StreamCategory>('music_channels');
  const [activeSubGroup, setActiveSubGroup] = useState('All');
  const [filteredStreams, setFilteredStreams]= useState<StreamItem[]>([]);

  // ── Form State
  const [formName,     setFormName]     = useState('');
  const [formUrl,      setFormUrl]      = useState('');
  const [formCategory, setFormCategory] = useState<StreamCategory>('music_channels');
  const [formGroup,    setFormGroup]    = useState('');
  const [formLogo,     setFormLogo]     = useState('');

  // ── Stream Player
  const player = useStreamPlayer({
    onSuccess: (item) => {
      setStreams(prev =>
        prev.map(s => s.id === item.id
          ? { ...s, failCount: 0, lastSeen: Date.now(), hidden: false }
          : s
        )
      );
    },
    onNextStream: () => {
      if (filteredStreams.length < 2) return;
      const idx = filteredStreams.findIndex(s => s.id === player.currentStream?.id);
      const next = filteredStreams[(idx === -1 ? 0 : idx + 1) % filteredStreams.length];
      player.startStream({ ...next, currentQualityIndex: 0 });
    },
  });

  // ── Fetch M3U files
  const fetchStreams = useCallback(async (force = false) => {
    setFetchError(null);

    // استخدم الـ cache إذا كان حديثاً
    if (!force) {
      const cached = loadCachedStreams();
      if (cached) {
        setStreams(cached);
        return;
      }
    }

    setIsLoadingM3U(true);
    setStreams(DEFAULT_PRESET_STREAMS); // أظهر الـ defaults فوراً

    const sources: { url: string; cat: StreamCategory }[] = [
      { url: STREAM_SOURCES.CHANNELS, cat: 'music_channels' },
      { url: STREAM_SOURCES.RADIO,    cat: 'radio'          },
      { url: STREAM_SOURCES.MUSIC,    cat: 'music_audio'    },
    ];

    const allFetched: StreamItem[] = [...DEFAULT_PRESET_STREAMS];
    let anySuccess = false;

    await Promise.all(
      sources.map(async ({ url, cat }) => {
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Accept': 'text/plain, application/x-mpegurl, */*' },
          });

          if (!res.ok) {
            console.warn(`[IPTV] ${cat} fetch failed: ${res.status} ${url}`);
            return;
          }

          const text = await res.text();

          if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
            console.warn(`[IPTV] ${cat} — not a valid M3U file:`, url);
            return;
          }

          const parsed = parseM3U(text);
          console.info(`[IPTV] ${cat} — ${parsed.length} channels loaded`);

          const items: StreamItem[] = parsed.map((ch, idx) => ({
            id:                   `m3u_${cat}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            name:                 ch.name || 'Unnamed',
            category:             cat,
            group:                ch.group || 'Other',
            logo:                 ch.logo  || (cat === 'music_channels'
              ? 'https://i.imgur.com/Ki3ySUE.png'
              : 'https://i.imgur.com/3YsZPY6.jpeg'),
            url:                  ch.url,
            qualities:            [{ quality: 'Auto', url: ch.url }],
            currentQualityIndex:  0,
            failCount:            0,
            hidden:               false,
          }));

          allFetched.push(...items);
          anySuccess = true;
        } catch (err) {
          console.error(`[IPTV] fetch error for ${cat}:`, err);
        }
      })
    );

    if (anySuccess) {
      setStreams(allFetched);
      saveCache(allFetched);
    } else {
      setFetchError('تعذّر تحميل القنوات. تحقق من الاتصال.');
    }

    setIsLoadingM3U(false);
  }, []);

  // ── تشغيل الـ fetch عند الـ mount
  useEffect(() => {
    fetchStreams(false);
  }, [fetchStreams]);

  // ── صوت: أوقف الخلفية عند تشغيل بث
  useEffect(() => {
    if (isTvOpen && player.isPlaying && !player.isMuted && !player.isBuffering) {
      audioManager.suppressBg('iptv_broadcast');
    } else {
      audioManager.releaseBg('iptv_broadcast');
    }
    return () => audioManager.releaseBg('iptv_broadcast');
  }, [isTvOpen, player.isPlaying, player.isMuted, player.isBuffering]);

  // ── شغّل أول قناة عند فتح التلفاز
  useEffect(() => {
    if (!isTvOpen || player.currentStream) return;
    const first =
      streams.find(s => s.category === activeCategory && !s.hidden) ??
      streams.find(s => !s.hidden) ??
      streams[0];
    if (first) player.startStream(first);
  }, [isTvOpen, streams, activeCategory, player]);

  // ── حساب القائمة الحالية والـ subGroups
  const currentCategoryStreams = useMemo(() => {
    return streams.filter(s => s.category === activeCategory && !s.hidden);
  }, [streams, activeCategory]);

  const subGroups = useMemo(() => {
    return sortSubGroupChips(
      Array.from(new Set(currentCategoryStreams.map(s => s.group))).filter(Boolean),
      activeCategory
    );
  }, [currentCategoryStreams, activeCategory]);

  // ── CRUD handlers
  const saveStreams = (list: StreamItem[]) => {
    setStreams(list);
    saveCache(list);
  };

  const handleOpenAdd = () => {
    setFormName(''); setFormUrl(''); setFormCategory(activeCategory);
    setFormGroup(''); setFormLogo('');
    setModalMode('add'); setEditId(null); setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StreamItem) => {
    setFormName(item.name);
    setFormUrl(item.qualities.map(q => q.url).join(', '));
    setFormCategory(item.category);
    setFormGroup(item.group ?? '');
    setFormLogo(item.logo ?? '');
    setModalMode('edit'); setEditId(item.id); setIsModalOpen(true);
  };

  const handleDelete = (idToDel: string) => {
    const updated = streams.filter(s => s.id !== idToDel);
    saveStreams(updated);
    if (player.currentStream?.id === idToDel && updated.length > 0) {
      player.startStream(updated[0]);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const urls  = formUrl.split(/[,;\s]+/).map(u => u.trim()).filter(Boolean);
    const quals = urls.map((u, i) => ({
      quality: urls.length === 1 ? 'Source' : `Backup #${i + 1}`,
      url:     u,
    }));

    if (modalMode === 'add') {
      const added: StreamItem = {
        id:                  `custom_${Date.now()}`,
        name:                formName,
        category:            formCategory,
        group:               formGroup || 'Custom',
        logo:                formLogo  || 'https://i.imgur.com/Ki3ySUE.png',
        url:                 urls[0],
        qualities:           quals,
        currentQualityIndex: 0,
        failCount:           0,
        hidden:              false,
      };
      saveStreams([...streams, added]);
      setActiveCategory(formCategory);
      player.startStream(added);
    } else {
      const updated = streams.map(s =>
        s.id === editId
          ? { ...s, name: formName, category: formCategory, group: formGroup || 'Custom',
              logo: formLogo || 'https://i.imgur.com/Ki3ySUE.png',
              url: urls[0], qualities: quals, currentQualityIndex: 0 }
          : s
      );
      saveStreams(updated);
      const matched = updated.find(s => s.id === editId);
      if (matched) { setActiveCategory(formCategory); player.startStream(matched); }
    }
    setIsModalOpen(false);
  };

  const handleForceRefresh = () => {
    clearCache();
    fetchStreams(true);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(p => !p);
    if (isMobile && player.videoRef.current) {
      const v = player.videoRef.current;
      if (v.requestFullscreen)                 v.requestFullscreen().catch(() => {});
      else if ((v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen();
      if ((screen.orientation as any)?.lock)
        (screen.orientation as any).lock('landscape').catch(() => {});
    }
  };

  // ════════════════════════════════════════
  // CLOSED STATE
  // ════════════════════════════════════════
  if (!isTvOpen) {
    return (
      <div className="flex justify-center w-full max-w-full px-2 sm:max-w-5xl sm:mx-auto sm:px-4">
        <div
          className="flex flex-col items-center gap-4 p-4 font-mono text-center cursor-pointer border-[3px] border-[var(--ink-color)] bg-[var(--paper-color)] shadow-[5px_5px_0_var(--manga-shadow-color)] sm:shadow-[10px_10px_0_var(--manga-shadow-color)] transition-all hover:scale-[1.02] active:scale-95 duration-200 select-none"
          onClick={() => setIsTvOpen(true)}
          role="button"
          aria-label="فتح التلفاز"
        >
          <img
            src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/TV.webp"
            alt="بث مباشر"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full max-w-[280px] sm:max-w-xs rounded object-cover"
            style={{ filter: resolvedTheme === 'dark' ? 'brightness(0.7) grayscale(1)' : 'none' }}
          />
          <p className={`text-base font-bold font-mono ${
            resolvedTheme === 'dark'     ? 'text-[#B8FF3F]' :
            resolvedTheme === 'bit'      ? 'text-[#ff00ff]' :
            resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-800'
          }`}>
            بغيتي تفرج؟ علاش لا؟
          </p>
          <p className="text-[10px] text-zinc-500 tracking-widest uppercase">
            اضغط لفتح التلفاز — بث مباشر
          </p>
          {isLoadingM3U && (
            <p className="text-[10px] text-zinc-400 animate-pulse">
              ⟳ جارٍ تحميل القنوات...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // OPEN STATE
  // ════════════════════════════════════════
  return (
    <div className="w-full flex-grow flex flex-col items-center p-1 sm:p-2 font-mono">
      <div
        className={`w-full sm:max-w-5xl rounded overflow-hidden flex flex-col select-none ${
          isMobile ? 'min-h-dvh h-auto' : isFullscreen ? 'fixed inset-0 z-[9000]' : 'h-[600px]'
        }`}
        style={{ backgroundColor: skin.outerBg, border: skin.borderStyle }}
      >
        {/* ── Title bar ─────────────────── */}
        <div
          className={`h-9 px-3 flex items-center justify-between text-xs font-bold text-white bg-gradient-to-r ${skin.headerGradient} flex-shrink-0 ${isMobile ? 'sticky top-0 z-10' : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Tv className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span className="truncate">{skin.windowTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Force refresh */}
            <button
              onClick={handleForceRefresh}
              title="إعادة تحميل القنوات"
              className="p-1 rounded hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
              style={isMobile ? { minWidth: 36, minHeight: 36 } : {}}
              aria-label="إعادة تحميل"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingM3U ? 'animate-spin' : ''}`} />
            </button>
            {/* Close */}
            <button
              onClick={() => { setIsTvOpen(false); player.stopStream(); }}
              className="px-2 py-0.5 rounded hover:bg-red-600/30 transition-colors font-bold"
              style={isMobile ? { minWidth: 44, minHeight: 36 } : {}}
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Main body ─────────────────── */}
        <div
          className="flex-grow overflow-hidden flex"
          style={{
            flexDirection:  isMobile ? 'column' : 'row',
            height:         isMobile ? 'auto' : undefined,
          }}
        >
          {/* Video Player */}
          <StreamPlayer
            videoRef={player.videoRef}
            isPlaying={player.isPlaying}
            isMuted={player.isMuted}
            volume={player.volume}
            isBuffering={player.isBuffering}
            error={player.error}
            streamName={player.currentStream?.name}
            category={activeCategory}
            qualities={player.currentStream?.qualities}
            currentQualityIndex={player.currentStream?.currentQualityIndex}
            onToggleMute={player.toggleMute}
            onTogglePlayback={player.onTogglePlayback}
            onVolumeChange={player.setVolume}
            onStop={player.stopStream}
            onFullscreen={handleToggleFullscreen}
            onQualityChange={player.switchQuality}
            onRetry={() => player.currentStream && player.startStream(player.currentStream)}
            onNextStream={() => {
              if (filteredStreams.length < 2) return;
              const idx = filteredStreams.findIndex(s => s.id === player.currentStream?.id);
              player.startStream({
                ...filteredStreams[(idx === -1 ? 0 : idx + 1) % filteredStreams.length],
                currentQualityIndex: 0,
              });
            }}
            theme={resolvedTheme}
          />

          {/* Sidebar */}
          {isSidebarOpen && !isFullscreen && (
            <div
              className={`flex flex-col border-t md:border-t-0 md:border-l flex-shrink-0 overflow-hidden ${skin.sidebarBg}`}
              style={{ width: isMobile ? '100%' : 256 }}
            >
              {/* Category tabs: TV / Radio / Music */}
              <div className="flex items-center justify-between border-b border-zinc-600/30 flex-shrink-0">
                <div
                  className="grid grid-cols-3 flex-grow divide-x divide-zinc-600/30"
                  style={{ height: isMobile ? 48 : 36 }}
                >
                  {(['music_channels', 'radio', 'music_audio'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setActiveSubGroup('All'); }}
                      className={`font-bold cursor-pointer transition-all flex items-center justify-center text-xs ${
                        activeCategory === cat ? skin.activePill : `${skin.sidebarBg} text-zinc-400`
                      }`}
                      style={isMobile ? { minHeight: 44 } : {}}
                      aria-pressed={activeCategory === cat}
                    >
                      {cat === 'music_channels' ? '📺 TV' : cat === 'radio' ? '📻 Radio' : '🎵 Audio'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <StreamSearch
                streams={currentCategoryStreams}
                onResults={setFilteredStreams}
                theme={resolvedTheme}
              />

              {/* SubGroup chips */}
              <div
                className="overflow-x-auto flex gap-1.5 p-1.5 flex-shrink-0 border-b border-zinc-600/30"
                style={{ scrollbarWidth: 'none' }}
              >
                <button
                  onClick={() => setActiveSubGroup('All')}
                  className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0 ${
                    activeSubGroup === 'All' ? skin.activePill : skin.chipInactive
                  }`}
                  style={isMobile ? { minHeight: 36, minWidth: 44 } : {}}
                >
                  الكل
                </button>
                {subGroups.map(grp => (
                  <button
                    key={grp}
                    onClick={() => setActiveSubGroup(grp)}
                    className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap flex-shrink-0 ${
                      activeSubGroup === grp ? skin.activePill : skin.chipInactive
                    }`}
                    style={isMobile ? { minHeight: 36 } : {}}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* Loading indicator */}
              {isLoadingM3U && (
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-zinc-400 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  جارٍ تحميل القنوات...
                </div>
              )}

              {/* Error indicator */}
              {fetchError && !isLoadingM3U && (
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-red-400 flex-shrink-0">
                  <span>⚠</span>
                  {fetchError}
                </div>
              )}

              {/* Stream list */}
              <StreamList
                streams={filteredStreams.filter(
                  s => activeSubGroup === 'All' || s.group === activeSubGroup
                )}
                currentStreamId={player.currentStream?.id}
                onPlay={player.startStream}
                onHide={() => {}}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                theme={resolvedTheme}
              />

              {/* Bottom actions */}
              <div
                className="p-2 flex gap-1 border-t border-zinc-600/30 justify-between items-center flex-shrink-0"
                style={{
                  backgroundColor: skin.footerBg,
                  minHeight: isMobile ? 52 : 40,
                }}
              >
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                  style={isMobile ? { minHeight: 44, minWidth: 80 } : {}}
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => { if (window.confirm('إعادة تعيين القنوات؟')) saveStreams(DEFAULT_PRESET_STREAMS); }}
                    className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                    style={isMobile ? { minHeight: 44, minWidth: 44 } : {}}
                    title="تصفير"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => saveStreams([...streams].sort((a, b) => a.name.localeCompare(b.name)))}
                    className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                    style={isMobile ? { minHeight: 44, minWidth: 44 } : {}}
                    title="ترتيب أبجدي"
                  >
                    <SortAsc className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer bar ─────────────────── */}
        <div
          className="h-6 px-3 flex items-center justify-between font-mono text-[10px] border-t border-zinc-600/30 flex-shrink-0"
          style={{ backgroundColor: skin.footerBg }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">BROADCAST LIVE • RETRO_DECK V3.2</span>
            <span className="sm:hidden">LIVE</span>
            {isLoadingM3U && <span className="text-zinc-500">• loading...</span>}
          </div>
          <button
            onClick={() => setIsSidebarOpen(p => !p)}
            className="text-[10px] border border-zinc-500/40 px-1.5 py-0.5 rounded text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors"
            style={isMobile ? { minHeight: 24 } : {}}
          >
            {isSidebarOpen ? '↩ إخفاء' : '↪ القائمة'}
          </button>
        </div>
      </div>

      {/* ── Add/Edit Modal ────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className={isMobile ? '' : 'w-full max-w-sm'}
            style={isMobile ? {
              position:    'fixed',
              bottom:       0,
              left:         0,
              right:        0,
              maxHeight:    '85dvh',
              borderRadius: '16px 16px 0 0',
              paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)',
              overflowY:    'auto',
              background:   skin.outerBg,
              border:       skin.borderStyle,
              zIndex:       10010,
            } : undefined}
          >
            {isMobile && (
              <div style={{
                width: 36, height: 4,
                background: 'rgba(128,128,128,0.35)',
                borderRadius: 2,
                margin: '12px auto 8px',
              }} />
            )}
            <OsWindow title={modalMode === 'add' ? 'add_new_channel.deb' : 'edit_selected_stream.deb'}>
              <form onSubmit={handleSaveForm} className="p-4 font-sans text-xs flex flex-col gap-3">
                {[
                  { label: 'اسم القناة *', value: formName, set: setFormName, type: 'text', required: true },
                  { label: 'رابط البث *',  value: formUrl,  set: setFormUrl,  type: 'text', required: true },
                  { label: 'شعار (URL)',   value: formLogo, set: setFormLogo, type: 'text', required: false },
                ].map(({ label, value, set, type, required }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600">{label}</label>
                    <input
                      type={type}
                      required={required}
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="p-2 border border-zinc-400 bg-white text-zinc-900 font-mono outline-none"
                      style={isMobile ? { height: 44, fontSize: 14 } : { fontSize: 12 }}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600">التصنيف</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as StreamCategory)}
                      className="p-2 border border-zinc-400 bg-white text-zinc-900 font-bold"
                      style={isMobile ? { height: 44, fontSize: 14 } : { fontSize: 12 }}
                    >
                      <option value="music_channels">📺 قنوات</option>
                      <option value="radio">📻 راديو</option>
                      <option value="music_audio">🎵 موسيقى</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-zinc-600">المجموعة</label>
                    <input
                      type="text"
                      value={formGroup}
                      onChange={e => setFormGroup(e.target.value)}
                      placeholder="🇲🇦 Morocco"
                      className="p-2 border border-zinc-400 bg-white text-zinc-900"
                      style={isMobile ? { height: 44, fontSize: 14 } : { fontSize: 12 }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-zinc-300 text-zinc-900 px-4 py-2 rounded border font-bold"
                    style={isMobile ? { minHeight: 44 } : {}}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-700 text-white px-5 py-2 rounded font-bold hover:bg-emerald-600"
                    style={isMobile ? { minHeight: 44 } : {}}
                  >
                    حفظ
                  </button>
                </div>
              </form>
            </OsWindow>
          </div>
        </div>
      )}
    </div>
  );
}

export default IptvSection;
