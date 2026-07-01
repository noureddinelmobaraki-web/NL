import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Play, Pause, Check, ArrowLeft, Scissors } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useAuth } from '../../../context/AuthContext';
import { audioManager } from '../../../audio/audioManager';
import { invalidateProfile } from '../../accounts/profileCache';
import type { Track } from '../../music/engine/types';
import { prepareSeekableAudioSource } from '../../music/data/seekableSource';
import '../../../styles/components/clip-selector.css';

interface Props { track: Track; onBack: () => void; onSaved: () => void; }
const fmt = (s: number) => { if (!isFinite(s) || s < 0) s = 0; const m = Math.floor(s/60); const ss = Math.floor(s%60); return `${m}:${ss.toString().padStart(2,'0')}`; };

export function ThemeSongClipSelector({ track, onBack, onSaved }: Props) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [loadingBlob, setLoadingBlob] = useState(true);
  const [duration, setDuration] = useState(30);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  
  const startRef = useRef(start); const endRef = useRef(end);
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { endRef.current = end; }, [end]);

  const bars = useMemo(() => {
    const hash = track.title + track.artist;
    const items: number[] = [];
    for (let i = 0; i < 50; i++) {
      let code = 0;
      for (let j = 0; j < hash.length; j++) code = (code * 31 + hash.charCodeAt(j) + i) % 10000;
      items.push(10 + (code % 75));
    }
    return items;
  }, [track]);

  useEffect(() => {
    let cancelled = false; let dispose: (() => void) | null = null; setLoadingBlob(true);
    prepareSeekableAudioSource(track.src)
      .then(({ url, cleanup }) => {
        if (cancelled) { cleanup(); return; }
        dispose = cleanup; setLocalUrl(url);
      })
      .catch(() => { if (!cancelled) setLocalUrl(track.src); })
      .finally(() => { if (!cancelled) setLoadingBlob(false); });
    return () => { cancelled = true; if (dispose) dispose(); };
  }, [track.src]);

  useEffect(() => {
    if (!localUrl) return;
    const a = new Audio(localUrl); a.preload = 'auto'; audioRef.current = a;
    audioManager.register('preview_clip', a, 0.9);
    const onMeta = () => { const d = a.duration || 30; setDuration(d); setEnd((prev) => (prev && prev > 0 && prev < d ? prev : Math.min(d, 30))); };
    const onTime = () => { setPlayhead(a.currentTime); if (a.currentTime >= endRef.current) { a.pause(); a.currentTime = startRef.current; setPlaying(false); } };
    const onEnd = () => setPlaying(false);
    a.addEventListener('loadedmetadata', onMeta); a.addEventListener('timeupdate', onTime); a.addEventListener('ended', onEnd);
    return () => { a.pause(); a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd);
      try { audioManager.unregister('preview_clip'); audioManager.releaseExclusive('clip_preview'); } catch { /* noop */ } audioRef.current = null; };
  }, [localUrl]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    if (!a.paused) { a.pause(); setPlaying(false); try { audioManager.releaseExclusive('clip_preview'); } catch { /* noop */ } return; }
    try { audioManager.requestExclusive('preview_clip', 'clip_preview'); } catch { /* noop */ }
    if (a.currentTime < startRef.current || a.currentTime >= endRef.current) a.currentTime = startRef.current;
    a.volume = 0.9; a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);
  const posToTime = useCallback((clientX: number) => {
    const el = timelineRef.current; if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect(); let ratio = (clientX - rect.left) / rect.width;
    if (getComputedStyle(el).direction === 'rtl') ratio = 1 - ratio;
    ratio = Math.max(0, Math.min(1, ratio)); return ratio * duration;
  }, [duration]);
  const onThumbDown = useCallback((which: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation(); dragRef.current = which; (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return; const t = posToTime(e.clientX); const MIN_GAP = 1;
    if (dragRef.current === 'start') setStart(Math.min(t, Math.max(0, endRef.current - MIN_GAP)));
    else setEnd(Math.max(t, startRef.current + MIN_GAP));
  }, [posToTime]);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return; try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
    dragRef.current = null; const a = audioRef.current; if (a) a.currentTime = startRef.current;
  }, []);
  const onTrackDown = useCallback((e: React.PointerEvent) => {
    const t = posToTime(e.clientX); const which: 'start' | 'end' = Math.abs(t - startRef.current) <= Math.abs(t - endRef.current) ? 'start' : 'end';
    dragRef.current = which; if (which === 'start') setStart(Math.min(t, endRef.current - 1)); else setEnd(Math.max(t, startRef.current + 1));
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, [posToTime]);

  const save = useCallback(async () => {
    if (!user) return; setSaving(true);
    try { const { error } = await supabase.rpc('set_theme_song', { p_song_id: track.id, p_start: Math.round(start), p_end: Math.round(end) });
      if (error) throw error; invalidateProfile(user.id); onSaved();
    } catch (err) { console.error('[ClipSelector] save failed', err); } finally { setSaving(false); }
  }, [user, track.id, start, end, onSaved]);

  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);
  return (
    <div className="nl-clip-selector-container" dir="rtl">
      <div className="nl-clip-song-card">
        <img className="nl-clip-song-cover" src={track.coverUrl} alt="" />
        <div className="nl-clip-song-meta">
          <h4>{track.title}</h4>
          <p>{track.artist}</p>
        </div>
      </div>
      {loadingBlob ? (
        <div className="nl-clip-loading">
          <div className="nl-clip-spinner" />
          <p>جارٍ تجهيز الأغنية بكامل دقتها للمعالجة...</p>
        </div>
      ) : (
        <>
          <div ref={timelineRef} className="nl-clip-timeline-wrapper" onPointerDown={onTrackDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <div className="nl-clip-wave">
              {bars.map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="nl-clip-selected-range" style={{ insetInlineStart: `${pct(start)}%`, width: `${pct(end - start)}%` }} />
            <button className="nl-clip-thumb start" style={{ insetInlineStart: `${pct(start)}%` }} onPointerDown={onThumbDown('start')} aria-label="بداية" />
            <button className="nl-clip-thumb end" style={{ insetInlineStart: `${pct(end)}%` }} onPointerDown={onThumbDown('end')} aria-label="نهاية" />
            <div className="nl-clip-playhead" style={{ insetInlineStart: `${pct(playhead)}%` }} />
          </div>

          <div className="nl-clip-times">
            <span>{fmt(start)}</span>
            <span className="nl-clip-dur-badge"><Scissors size={11} /> المقطع: {fmt(end - start)}</span>
            <span>{fmt(end)}</span>
          </div>

          <div className="nl-clip-actions">
            <button type="button" className="nl-btn-glass" onClick={togglePlay}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              <span>{playing ? 'إيقاف مؤقت' : 'استماع للمقطع'}</span>
            </button>
            <div className="nl-clip-footer-btns">
              <button type="button" className="nl-btn-glass ghost" onClick={onBack}>
                <ArrowLeft size={14} /> رجوع
              </button>
              <button type="button" className="nl-btn-grad" onClick={save} disabled={saving}>
                {saving ? <span className="nl-clip-small-spinner" /> : <Check size={14} />}
                <span>حفظ المقطع</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
