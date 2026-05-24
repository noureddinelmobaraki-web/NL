import { useState, useEffect, useRef } from 'react';
import { Tv, Plus, RotateCcw, SortAsc } from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { audioManager } from '../../audio/audioManager';
import { STREAM_SOURCES } from '../../config/streams';
import { StreamItem } from './iptv/types';
import { useStreamPlayer } from './iptv/useStreamPlayer';
import { StreamSearch } from './iptv/StreamSearch';
import { StreamList } from './iptv/StreamList';
import { StreamPlayer } from './iptv/StreamPlayer';
import { DEFAULT_PRESET_STREAMS, parseM3U, sortSubGroupChips, THEME_SKIN } from './iptv/helpers';
import { useDeviceType } from '../../hooks/useDeviceType';

export function IptvSection() {
  const resolvedTheme = useResolvedTheme();
  const { isMobile } = useDeviceType();
  const [isTvOpen, setIsTvOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'radio' | 'music_channels' | 'music_audio'>('music_channels');
  const [activeSubGroup, setActiveSubGroup] = useState('All');
  const [filteredStreams, setFilteredStreams] = useState<StreamItem[]>(() => {
    try {
      const saved = localStorage.getItem('retro_tv_custom_playlist_v3');
      const list = saved ? JSON.parse(saved) : DEFAULT_PRESET_STREAMS;
      return list.filter((s: StreamItem) => s.category === 'music_channels' && !s.hidden);
    } catch {
      return DEFAULT_PRESET_STREAMS.filter(s => s.category === 'music_channels');
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<'radio' | 'music_channels' | 'music_audio'>('music_channels');
  const [formGroup, setFormGroup] = useState('');
  const [formLogo, setFormLogo] = useState('');

  const [streams, setStreams] = useState<StreamItem[]>(() => {
    try {
      const saved = localStorage.getItem('retro_tv_custom_playlist_v3');
      return saved ? JSON.parse(saved) : DEFAULT_PRESET_STREAMS;
    } catch { return DEFAULT_PRESET_STREAMS; }
  });

  const saveStreams = (list: StreamItem[]) => {
    setStreams(list);
    try { localStorage.setItem('retro_tv_custom_playlist_v3', JSON.stringify(list)); } catch {}
  };

  const player = useStreamPlayer({
    onSuccess: (item) => {
      saveStreams(streams.map(s => s.id === item.id ? { ...s, failCount: 0, lastSeen: Date.now(), hidden: false } : s));
    },
    onNextStream: () => {
      if (filteredStreams.length < 2) return;
      const idx = filteredStreams.findIndex(s => s.id === player.currentStream?.id);
      player.startStream({ ...filteredStreams[(idx === -1 ? 0 : idx + 1) % filteredStreams.length], currentQualityIndex: 0 });
    }
  });

  useEffect(() => {
    // تحقق من تاريخ آخر تحديث — أعد الجلب كل 24 ساعة
    const lastFetch = localStorage.getItem('retro_tv_last_fetch_v3');
    const isStale = !lastFetch || (Date.now() - parseInt(lastFetch)) > 86400000;

    if (!isStale && localStorage.getItem('retro_tv_custom_playlist_v3')) {
      try {
        const saved = JSON.parse(localStorage.getItem('retro_tv_custom_playlist_v3')!);
        if (saved && saved.length > 0) return;
      } catch {}
    }
    // احذف القديم وأعد الجلب
    localStorage.removeItem('retro_tv_custom_playlist_v3');
    setStreams(DEFAULT_PRESET_STREAMS);

    const sources = [
      { url: STREAM_SOURCES.CHANNELS, cat: 'music_channels' as const },
      { url: STREAM_SOURCES.RADIO, cat: 'radio' as const },
      { url: STREAM_SOURCES.MUSIC, cat: 'music_audio' as const }
    ];
    Promise.all(sources.map(async (src) => {
      try {
        const res = await fetch(src.url, { cache: 'no-store' });
        if (!res.ok) return;
        const text = await res.text();
        const parsed = parseM3U(text).map((ch, idx) => ({
          id: `m3u_${src.cat}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          name: ch.name || 'Unnamed',
          category: src.cat,
          group: ch.group || 'Morocco',
          logo: ch.logo || (src.cat === 'music_channels' ? 'https://i.imgur.com/Ki3ySUE.png' : 'https://i.imgur.com/3YsZPY6.jpeg'),
          url: ch.url,
          qualities: [{ quality: 'Auto', url: ch.url }],
          currentQualityIndex: 0
        }));
        setStreams(prev => {
          const combined = [...prev, ...parsed];
          localStorage.setItem('retro_tv_custom_playlist_v3', JSON.stringify(combined));
          localStorage.setItem('retro_tv_last_fetch_v3', Date.now().toString());
          return combined;
        });
      } catch {}
    }));
  }, []);

  useEffect(() => {
    if (isTvOpen && player.isPlaying && !player.isMuted && !player.isBuffering) {
      audioManager.suppressBg('iptv_broadcast');
      audioManager.pause('lens');
    } else {
      audioManager.releaseBg('iptv_broadcast');
    }
    return () => audioManager.releaseBg('iptv_broadcast');
  }, [isTvOpen, player.isPlaying, player.isMuted, player.isBuffering]);

  // Clean stop of the stream when the TV container is closed
  useEffect(() => {
    if (!isTvOpen) {
      player.stopStream();
    }
  }, [isTvOpen, player]);

  // Set initial live station on open and change category
  const lastCategoryRef = useRef(activeCategory);
  useEffect(() => {
    if (!isTvOpen) return;
    const catChanged = activeCategory !== lastCategoryRef.current;
    lastCategoryRef.current = activeCategory;

    if (streams.length > 0) {
      if (!player.currentStream || catChanged) {
        const active = streams.find(s => s.category === activeCategory) || streams[0];
        player.startStream(active);
      }
    }
  }, [isTvOpen, streams, activeCategory, player]);

  const currentCategoryStreams = streams.filter(s => s.category === activeCategory && !s.hidden);
  const subGroups = sortSubGroupChips(Array.from(new Set(currentCategoryStreams.map(s => s.group))).filter(Boolean), activeCategory);

  const handleOpenAdd = () => {
    setFormName(''); setFormUrl(''); setFormCategory(activeCategory); setFormGroup(''); setFormLogo('');
    setModalMode('add'); setEditId(null); setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StreamItem) => {
    setFormName(item.name); setFormUrl(item.qualities.map(q => q.url).join(', '));
    setFormCategory(item.category); setFormGroup(item.group || ''); setFormLogo(item.logo || '');
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
    const urls = formUrl.split(/[,;]+/).map(u => u.trim()).filter(Boolean);
    const quals = urls.map((u, i) => ({ quality: urls.length === 1 ? 'Source' : `Backup #${i + 1}`, url: u }));
    if (modalMode === 'add') {
      const added: StreamItem = { id: `custom_${Date.now()}`, name: formName, category: formCategory, group: formGroup || 'General', logo: formLogo || 'https://i.imgur.com/Ki3ySUE.png', url: urls[0], qualities: quals, currentQualityIndex: 0 };
      saveStreams([...streams, added]);
      setActiveCategory(formCategory);
      player.startStream(added);
    } else {
      const updated = streams.map(s => s.id === editId ? { ...s, name: formName, category: formCategory, group: formGroup || 'General', logo: formLogo || 'https://i.imgur.com/Ki3ySUE.png', url: urls[0], qualities: quals, currentQualityIndex: 0 } : s);
      saveStreams(updated);
      const matched = updated.find(s => s.id === editId);
      if (matched) { setActiveCategory(formCategory); player.startStream(matched); }
    }
    setIsModalOpen(false);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(p => !p);
    if (isMobile && player.videoRef.current) {
      if (player.videoRef.current.requestFullscreen) {
        player.videoRef.current.requestFullscreen().catch(() => {});
      } else if ((player.videoRef.current as any).webkitEnterFullscreen) {
        (player.videoRef.current as any).webkitEnterFullscreen();
      }
      if ((screen.orientation as any)?.lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    }
  };

  const skin = THEME_SKIN[resolvedTheme as keyof typeof THEME_SKIN] || THEME_SKIN.light;

  if (!isTvOpen) {
    return (
      <div className="flex justify-center w-full max-w-full px-2 sm:max-w-5xl sm:px-4">
        <div 
          className="flex flex-col items-center gap-4 p-4 font-mono text-center cursor-pointer border-[3px] border-[var(--ink-color)] bg-[var(--paper-color)] shadow-[5px_5px_0_var(--manga-shadow-color)] sm:shadow-[10px_10px_0_var(--manga-shadow-color)]" 
          onClick={() => setIsTvOpen(true)}
        >
          <img 
            src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/TV.webp" 
            alt="Tv" 
            referrerPolicy="no-referrer" 
            className="w-full max-w-[280px] sm:max-w-none rounded object-cover cursor-pointer transition-all hover:scale-105 duration-300" 
            style={{ filter: resolvedTheme === 'dark' ? 'brightness(0.7) grayscale(1)' : 'none' }} 
          />
          <div className={`text-base font-bold ${resolvedTheme === 'dark' ? 'text-[#B8FF3F]' : resolvedTheme === 'bit' ? 'text-[#ff00ff]' : resolvedTheme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-800'}`}>بغيتي تفرج؟ علاش لا؟</div>
          <div className="text-[10px] text-zinc-500">اضغط لفتح التلفاز البث المباشر</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-grow flex flex-col items-center p-2 font-mono">
      <div 
        className={`w-full max-w-5xl rounded overflow-hidden flex flex-col select-none ${
          isMobile ? 'h-auto min-h-screen' : 'h-[600px]'
        } ${
          resolvedTheme === 'bit' ? 'shadow-[4px_4px_0_0_rgba(255,0,204,0.6)]' : 'shadow-2xl border-2'
        }`} 
        style={{ backgroundColor: skin.outerBg, border: skin.borderStyle }}
      >
        {/* OS Window header */}
        <div className={`h-8 md:h-8 h-9 px-3 flex items-center justify-between text-xs font-bold text-white bg-gradient-to-r ${skin.headerGradient} ${isMobile ? 'sticky top-0 z-10' : ''}`}>
          <div className="flex items-center gap-1.5"><Tv className="w-4 h-4 animate-pulse" /> <span>{skin.windowTitle}</span></div>
          <button style={isMobile ? { minWidth: 44, minHeight: 44 } : {}} onClick={() => setIsTvOpen(false)} className="hover:bg-red-600/20 px-2 py-0.5 rounded cursor-pointer transition-transform duration-200 flex items-center justify-center">❌</button>
        </div>

        <div 
          style={{
            height: isMobile ? 'auto' : (isFullscreen ? '100dvh' : '520px'),
            minHeight: isMobile ? '100dvh' : undefined,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
          }}
          className="flex-1 overflow-hidden relative"
        >
          <StreamPlayer videoRef={player.videoRef} isPlaying={player.isPlaying} isMuted={player.isMuted} volume={player.volume} isBuffering={player.isBuffering} error={player.error} streamName={player.currentStream?.name} category={activeCategory} qualities={player.currentStream?.qualities} currentQualityIndex={player.currentStream?.currentQualityIndex} onToggleMute={player.toggleMute} onTogglePlayback={player.onTogglePlayback} onVolumeChange={player.setVolume} onStop={player.stopStream} onFullscreen={handleToggleFullscreen} onQualityChange={player.switchQuality} onRetry={() => player.currentStream && player.startStream(player.currentStream)} onNextStream={() => { if (filteredStreams.length > 1) { const idx = filteredStreams.findIndex(s => s.id === player.currentStream?.id); player.startStream({ ...filteredStreams[(idx === -1 ? 0 : idx + 1) % filteredStreams.length], currentQualityIndex: 0 }); }}} theme={resolvedTheme} />

          {/* Sidebar */}
          {isSidebarOpen && !isFullscreen && (
            <div className={`w-full md:w-64 flex flex-col border-t md:border-t-0 md:border-l h-auto md:h-full overflow-hidden ${skin.sidebarBg}`}>
              {/* Category tabs */}
              <div className="flex items-center justify-between border-b border-zinc-400 flex-shrink-0">
                <div style={{ height: isMobile ? 48 : 36 }} className="grid grid-cols-3 flex-grow divide-x divide-zinc-400">
                  {(['music_channels', 'radio', 'music_audio'] as const).map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => { setActiveCategory(cat); setActiveSubGroup('All'); }} 
                      style={isMobile ? { minHeight: 44 } : {}}
                      className={`font-bold cursor-pointer transition-all flex items-center justify-center ${isMobile ? 'text-xs' : 'text-[10px]'} ${activeCategory === cat ? skin.activePill : 'bg-transparent text-zinc-500'}`}
                    >
                      {cat === 'music_channels' ? '📺 TV' : cat === 'radio' ? '📻 Live' : '🎵 Audio'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('retro_tv_custom_playlist_v3');
                    localStorage.removeItem('retro_tv_last_fetch_v3');
                    window.location.reload();
                  }}
                  title="إعادة تحميل القنوات"
                  style={{
                    fontSize: '10px',
                    padding: '4px 8px',
                    opacity: 0.7,
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-100 flex items-center gap-0.5 px-2 py-1 select-none text-zinc-400 hover:text-white transition-opacity font-bold shrink-0"
                >
                  ↻ تحديث
                </button>
              </div>

              {/* Search Bar */}
              <StreamSearch streams={currentCategoryStreams} onResults={setFilteredStreams} theme={resolvedTheme} />

              {/* SubGrp Chips */}
              <div className="overflow-x-auto whitespace-nowrap p-1.5 flex gap-1.5 flex-shrink-0 select-none [&::-webkit-scrollbar]:hidden border-b border-zinc-400">
                <button 
                  onClick={() => setActiveSubGroup('All')} 
                  style={isMobile ? { minHeight: 44, minWidth: 44 } : {}}
                  className={`px-2 py-0.5 rounded cursor-pointer flex items-center justify-center ${isMobile ? 'text-xs' : 'text-[10px]'} ${activeSubGroup === 'All' ? skin.activePill : 'bg-zinc-300 text-zinc-700'}`}
                >
                  الكل
                </button>
                {subGroups.map(grp => (
                  <button 
                    key={grp} 
                    onClick={() => setActiveSubGroup(grp)} 
                    style={isMobile ? { minHeight: 44, minWidth: 44 } : {}}
                    className={`px-2 py-0.5 rounded cursor-pointer flex items-center justify-center ${isMobile ? 'text-xs' : 'text-[10px]'} ${activeSubGroup === grp ? skin.activePill : 'bg-zinc-300 text-zinc-700'}`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* List */}
              <StreamList streams={filteredStreams.filter(s => activeSubGroup === 'All' || s.group === activeSubGroup)} currentStreamId={player.currentStream?.id} onPlay={player.startStream} onHide={()=>{}} onEdit={handleOpenEdit} onDelete={handleDelete} theme={resolvedTheme} />

              {/* Action buttons bar */}
              <div className="p-2 flex gap-1 bg-black/10 border-t border-zinc-400 justify-between items-center" style={isMobile ? { minHeight: 52 } : {}}>
                <button 
                  onClick={handleOpenAdd} 
                  style={isMobile ? { minHeight: 44, minWidth: 80 } : {}}
                  className="flex items-center justify-center gap-1 bg-emerald-700 text-white px-3 py-1.5 rounded hover:bg-emerald-800 text-xs md:text-[10px] md:min-h-0 md:px-2 md:py-1"
                >
                  <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" /> إضافة
                </button>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { if(window.confirm('تعيين البثوث التلقائية؟')) saveStreams(DEFAULT_PRESET_STREAMS); }} 
                    style={isMobile ? { minHeight: 44, minWidth: 44 } : {}}
                    className="p-1 hover:bg-white/20 rounded flex items-center justify-center text-zinc-400 hover:text-white" 
                    title="تصفير"
                  >
                    <RotateCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                  <button 
                    onClick={() => saveStreams([...streams].sort((a,b)=>a.name.localeCompare(b.name)))} 
                    style={isMobile ? { minHeight: 44, minWidth: 44 } : {}}
                    className="p-1 hover:bg-white/20 rounded flex items-center justify-center text-zinc-400 hover:text-white" 
                    title="ترتيب"
                  >
                    <SortAsc className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="h-6 px-3 flex items-center justify-between font-mono text-[10px] border-t border-zinc-400" style={{ backgroundColor: skin.footerBg }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Classic Broadcast LIVE • RETRO_DECK V3.2</span>
          </div>
          <button style={isMobile ? { minHeight: 44 } : {}} onClick={() => setIsSidebarOpen(p => !p)} className="text-[10px] border px-1.5 py-0.5 rounded bg-zinc-300 text-zinc-800 flex items-center justify-center">{isSidebarOpen ? 'إخفاء القائمة' : 'عرض القائمة'}</button>
        </div>
      </div>

      {/* Custom Add/Edit Modal -> Bottom Sheet on Mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4">
          <div 
            style={isMobile ? {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '85dvh',
              borderRadius: '16px 16px 0 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
              overflowY: 'auto',
              backgroundColor: skin.outerBg,
              borderTop: skin.borderStyle,
              zIndex: 10010,
              boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.5)'
            } : undefined}
            className={isMobile ? "" : "w-full max-w-sm"}
          >
            {isMobile && (
              /* drag handle */
              <div style={{
                width: 36, height: 4,
                background: 'rgba(128, 128, 128, 0.4)',
                borderRadius: 2,
                margin: '12px auto 8px',
              }} />
            )}
            
            <OsWindow title={modalMode === 'add' ? 'add_new_channel.deb' : 'edit_selected_stream.deb'}>
              <form onSubmit={handleSaveForm} className="p-4 font-sans text-xs flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-700 font-bold">اسم القناة *</label>
                  <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="p-2 border border-zinc-400 bg-white text-zinc-950 font-bold outline-none h-11 text-sm md:h-auto md:p-1 md:text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-700 font-bold">الرابط *</label>
                  <input type="text" required value={formUrl} onChange={e => setFormUrl(e.target.value)} className="p-2 border border-zinc-400 bg-white text-zinc-950 font-mono h-11 text-sm md:h-auto md:p-1 md:text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-700 font-bold">التصنيف</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className="p-2 border border-zinc-400 bg-white text-zinc-950 font-bold h-11 text-sm md:h-auto md:p-1 md:text-xs">
                      <option value="music_channels">📺 قنوات</option>
                      <option value="radio">📻 راديو</option>
                      <option value="music_audio">🎵 موسيقى</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-700 font-bold">المجموعة</label>
                    <input type="text" value={formGroup} onChange={e => setFormGroup(e.target.value)} className="p-2 border border-zinc-400 bg-white text-zinc-950 font-bold h-11 text-sm md:h-auto md:p-1 md:text-xs" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-700 font-bold">رابط الشعار</label>
                  <input type="text" value={formLogo} onChange={e => setFormLogo(e.target.value)} className="p-2 border border-zinc-400 bg-white text-zinc-950 h-11 text-sm md:h-auto md:p-1 md:text-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-2 pb-4 md:pb-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="bg-zinc-300 text-zinc-950 px-4 py-2 min-h-[44px] min-w-[80px] rounded border font-bold flex items-center justify-center md:min-h-0 md:min-w-0 md:px-3 md:py-1">إلغاء</button>
                  <button type="submit" className="bg-emerald-700 text-white px-5 py-2 min-h-[44px] min-w-[80px] rounded font-bold flex items-center justify-center md:min-h-0 md:min-w-0 md:px-4 md:py-1">حفظ</button>
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
