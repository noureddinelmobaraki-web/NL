import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useYouTubeIframeApi } from './useYouTubeIframeApi';
import { formatDuration } from './format';

interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
}

export function YouTubePlayer({ videoId, autoplay = true }: YouTubePlayerProps) {
  const apiReady = useYouTubeIframeApi();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ccOn, setCcOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const killCaptions = useCallback((p: YT.Player) => {
    try { p.unloadModule('captions'); } catch (err) { void err; }
    try { p.unloadModule('cc'); } catch (err) { void err; }
  }, []);

  const tick = useCallback(() => {
    const p = playerRef.current;
    if (p && typeof p.getCurrentTime === 'function') {
      const cur = p.getCurrentTime();
      const dur = p.getDuration();
      setCurrent(cur);
      if (dur && fillRef.current) {
        fillRef.current.style.width = ((cur / dur) * 100).toFixed(2) + '%';
      }
    }
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!apiReady || !hostRef.current) return;
    const hostEl = hostRef.current;
    const placeholder = document.createElement('div');
    hostEl.appendChild(placeholder);

    const player = new window.YT.Player(placeholder, {
      host: 'https://www.youtube-nocookie.com',
      videoId,
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        disablekb: 1,
        playsinline: 1,
        fs: 0,
        cc_load_policy: 0,
        hl: 'en',
        autoplay: autoplay ? 1 : 0,
      },
      events: {
        onReady: (e) => {
          playerRef.current = e.target;
          setReady(true);
          setDuration(e.target.getDuration());
          setMuted(e.target.isMuted());
          killCaptions(e.target);
          setCcOn(false);
          if (autoplay) {
            e.target.playVideo();
          }
        },
        onStateChange: (e) => {
          const S = window.YT.PlayerState;
          setPlaying(e.data === S.PLAYING);
          const dur = e.target.getDuration();
          if (dur) setDuration(dur);
          if (e.data === S.PLAYING && !ccOn) {
            killCaptions(e.target);
          }
        },
      },
    });
    playerRef.current = player;
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      try {
        player.destroy();
      } catch {
        // noop
      }
      playerRef.current = null;
      if (hostEl) {
        hostEl.innerHTML = '';
      }
    };
  }, [apiReady, videoId, autoplay, tick, killCaptions, ccOn]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }, [playing]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  }, []);

  const toggleCaptions = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (ccOn) {
      try { p.unloadModule('captions'); } catch (err) { void err; }
      try { p.unloadModule('cc'); } catch (err) { void err; }
      setCcOn(false);
    } else {
      try {
        p.loadModule('captions');
        p.loadModule('cc');
        p.setOption('captions', 'reload', true);
      } catch (err) { void err; }
      setCcOn(true);
    }
  }, [ccOn]);

  const seek = useCallback((clientX: number, el: HTMLDivElement) => {
    const p = playerRef.current;
    if (!p) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const dur = p.getDuration() || duration;
    p.seekTo(ratio * dur, true);
  }, [duration]);

  const onTrackClick = useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    seek(ev.clientX, ev.currentTarget);
  }, [seek]);

  const goFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen();
    }
  }, []);

  return (
    <div className="nl-tube-player" ref={wrapRef}>
      <div className="nl-tube-stage">
        <div ref={hostRef} className="nl-tube-iframe-host" />
        <button className="nl-tube-surface" onClick={togglePlay} aria-label="Play or pause" />
        {!ready ? <div className="nl-tube-spinner" aria-hidden="true" /> : null}
      </div>
      <div className="nl-tube-controls">
        <button className="nl-tube-ctl" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="nl-tube-track" onClick={onTrackClick} role="slider" aria-label="Seek" tabIndex={0}>
          <div className="nl-tube-track-fill" ref={fillRef} />
        </div>
        <span className="nl-tube-time">{formatDuration(current)} / {formatDuration(duration)}</span>
        <button
          className={ccOn ? 'nl-tube-ctl nl-tube-cc is-on' : 'nl-tube-ctl nl-tube-cc'}
          onClick={toggleCaptions}
          aria-label="Toggle captions"
          aria-pressed={ccOn}
          title="Captions"
        >
          CC
        </button>
        <button className="nl-tube-ctl" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button className="nl-tube-ctl" onClick={goFullscreen} aria-label="Fullscreen">
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
