import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { useMusicStore } from '../../music/store/musicStore';
import { getInitials } from '../../music/utils/cover';
import { audioManager } from '../../../audio/audioManager';
import { nowPlayingBus, type NowPlayingControls } from '../../../audio/nowPlayingBus';


const FULL_VOL = 0.85;   // مستوى صوت أغنية البروفايل

export function ThemeSongBar({
  songId,
  start,
  end,
  canRemove = false,
  onRemove,
}: {
  songId: string | null | undefined;
  start?: number | null;
  end?: number | null;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  // نشترك في المسار المطلوب فقط — لا في مصفوفة tracks كاملة (تفادي إعادة رندر من متجر ضخم).
  const track = useMusicStore(
    useCallback(
      (s) => (songId ? s.tracks.find((t) => t.id === songId) ?? null : null),
      [songId],
    ),
  ) ?? (songId ? useMusicStore.getState().tracks.find((t) => t.id === songId) ?? null : null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // مرجع ثابت لأحدث track حتى لا تحتاج useEffect/useCallback إلى إضافته كتبعية (يتجنّب تحذيرات exhaustive-deps).
  const trackRef = useRef(track);
  trackRef.current = track;
  
  // مرجع ثابت لدالة التبديل + كائن أزرار تحكّم ثابت (نفس المرجع دائمًا حتى لا
  // يُبطل حارس shallowEqual في الـ bus). toggle=stop لأن togglePlay يتكفّل بالحالتين.
  const toggleRef = useRef<() => void>(() => {});
  const controlsRef = useRef<NowPlayingControls>({
    toggle: () => toggleRef.current(),
    stop: () => toggleRef.current(),
  });
  
  const clipStart = Math.max(0, start ?? 0);
  const clipEnd = end && end > clipStart ? end : null;
  const src = track?.src ?? null;

  // عنصر <audio> واحد فقط. بثّ تدرّجي مثل سبوتيفاي:
  // preload='metadata' → لا تنزيل كامل؛ المتصفح يبثّ الصوت عند play() عبر HTTP Range.
  useEffect(() => {
    if (!src) return;

    const a = new Audio();
    a.preload = 'metadata';
    a.src = src;
    audioRef.current = a;

    // التنسيق عبر المدير (يوقف موسيقى NL ويكبت الخلفية). register يصفّر الصوت داخليًا،
    // ثم executePlay يتكفّل بالـ fade-in السلس (200ms) للمصدر 'profile'.
    audioManager.register('profile', a, FULL_VOL);
    audioManager.requestExclusive('profile', 'profile_song');

    let started = false;

    // تشغيل واحد محميّ بحارس started — يمنع نهائيًا إعادة التشغيل من البداية (سبب الشرارة/التكرار).
    const startOnce = () => {
      if (started) return;
      const el = audioRef.current;
      if (!el) return;
      started = true;
      try { if (clipStart) el.currentTime = clipStart; } catch { /* noop */ }
      el.volume = FULL_VOL;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setPlaying(true);
          nowPlayingBus.publish({ source: 'profile', title: trackRef.current?.title ?? 'Profile Song', subtitle: trackRef.current?.artist, artworkUrl: trackRef.current?.coverUrl, isPlaying: true, controls: controlsRef.current });
          // مزامنة حالة المدير دون مقاطعة (العنصر يعمل أصلًا → لن يُعيد التشغيل).
          audioManager.play('profile').catch(() => {});
        }).catch(() => { started = false; /* محجوب: يُعاد عند أول تفاعل */ });
      } else {
        setPlaying(true);
        nowPlayingBus.publish({ source: 'profile', title: trackRef.current?.title ?? 'Profile Song', subtitle: trackRef.current?.artist, artworkUrl: trackRef.current?.coverUrl, isPlaying: true, controls: controlsRef.current });
      }
    };

    // حلقة المقطع: مستمع timeupdate واحد فقط وعند وجود نهاية محدّدة.
    const onTime = clipEnd == null ? null : () => {
      const el = audioRef.current;
      if (el && el.currentTime >= clipEnd) {
        try { el.currentTime = clipStart; } catch { /* noop */ }
      }
    };

    // نبدأ عند أول جاهزية فقط (once) — لا loadedmetadata + loadeddata + canplay معًا.
    const onCanPlay = () => { startOnce(); };
    a.addEventListener('canplay', onCanPlay, { once: true });
    if (onTime) a.addEventListener('timeupdate', onTime);

    a.load();
    // محاولة فورية داخل نافذة إيماءة فتح البروفايل → تشغيل تلقائي حقيقي.
    startOnce();

    // إعادة المحاولة مرة واحدة عند أول تفاعل إذا مَنع المتصفّح التشغيل التلقائي.
    const kick = () => startOnce();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('touchend', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });

    return () => {
      a.removeEventListener('canplay', onCanPlay);
      if (onTime) a.removeEventListener('timeupdate', onTime);
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('touchend', kick);
      window.removeEventListener('keydown', kick);
      audioManager.stop('profile');
      audioManager.unregister('profile');
      audioManager.releaseExclusive('profile_song');
      nowPlayingBus.clear('profile');
      try { a.pause(); } catch { /* noop */ }
      a.src = '';
      a.load(); // يُلغي أي بثّ شبكي جارٍ فورًا (يوقف التنزيل).
      audioRef.current = null;
      setPlaying(false);
    };
  }, [src, clipStart, clipEnd]);

  // زر إيقاف/تشغيل حقيقي — يوقف الصوت فعليًا (لا يخفضه إلى 5%).
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.volume = FULL_VOL;
      a.play().then(() => {
        setPlaying(true);
        nowPlayingBus.publish({ source: 'profile', title: trackRef.current?.title ?? 'Profile Song', subtitle: trackRef.current?.artist, artworkUrl: trackRef.current?.coverUrl, isPlaying: true, controls: controlsRef.current });
        audioManager.play('profile').catch(() => {});
      }).catch(() => {});
    } else {
      audioManager.stop('profile'); // إيقاف كامل + تحرير كبت الخلفية.
      setPlaying(false);
      nowPlayingBus.clear('profile');
    }
  }, []);
  toggleRef.current = togglePlay;

  if (!track) return null;

  return (
    <div className="nl-theme-song" dir="rtl">
      <span className="nl-theme-song__cover" style={{ background: track.coverColor }}>
        {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <span>{getInitials(track.title)}</span>}
      </span>
      <span className="nl-theme-song__tube">
        <span className="nl-theme-song__eq" data-on={playing ? 'true' : 'false'}><i /><i /><i /><i /></span>
        <span className="nl-theme-song__name">{track.title}</span>
        <span className="nl-theme-song__artist">{track.artist}</span>
      </span>
      <button className="nl-theme-song__vol" onClick={togglePlay} aria-label={playing ? 'Stop Song' : 'Play Song'} title={playing ? 'Stop' : 'Play'}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      {canRemove && (
        <button className="nl-theme-song__remove" onClick={onRemove} aria-label="Remove Song" title="Remove"><X size={15} /></button>
      )}
    </div>
  );
}
