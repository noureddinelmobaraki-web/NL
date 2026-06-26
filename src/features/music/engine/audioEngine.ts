import { AudioGraph } from './audioGraph';
import { Track } from './types';
import { setMediaSessionMetadata, setMediaSessionPlaybackState, setMediaSessionPlaybackPosition, registerMediaSessionActions } from './mediaSession';
import { EQ_PRESETS } from './eqPresets';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private graph: AudioGraph | null = null;

  // Single audio element for simplicity
  private audio!: HTMLAudioElement;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  private currentTrack: Track | null = null;

  // Preferences / States
  private volume: number = 0.8;
  private muted: boolean = false;
  private rate: number = 1.0;
  private pan: number = 0;
  private eqBypass: boolean = false;
  private eqPreset: string = 'Flat';
  private eqGains: number[] = new Array(10).fill(0);
  private isPlayingState: boolean = false;
  private rafId: number | null = null;
  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  // Callbacks hooked by Zustand Store
  public onTimeUpdate?: (currentTime: number, duration: number, buffered: number) => void;
  public onEnded?: () => void;
  public onTrackError?: (msg: string) => void;
  public onPlayState?: (isPlaying: boolean) => void;
  public onRequestNext?: () => void;
  public onRequestPrev?: () => void;
  public onTrackChange?: (track: Track) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';

      // Setup ended handlers
      this.audio.addEventListener('ended', () => this.handleEnded());

      // Setup basic error handlers with fallback logic
      this.audio.addEventListener('error', () => this.handleError());
    }
  }

  public init() {
    if (this.ctx) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.graph = new AudioGraph(this.ctx);

      // Attempt to create media element sources.
      // Gracefully fall back to playing standard audio if browser sandbox blocks Web Audio routing
      try {
        this.sourceNode = this.ctx.createMediaElementSource(this.audio);
        this.sourceNode.connect(this.graph.inputNode);
      } catch (err) {
        console.warn('[AudioEngine] Failed to create MediaElementSource. Running in legacy mode.', err);
        this.sourceNode = null;
      }

      // Initial volume application
      this.applyVolume();

      // Register OS MediaSession keys
      registerMediaSessionActions({
        onPlay: () => this.play(),
        onPause: () => this.pause(),
        onPrev: () => { if (this.onRequestPrev) this.onRequestPrev(); },
        onNext: () => { if (this.onRequestNext) this.onRequestNext(); },
        onSeek: (offset) => this.seek(offset)
      });
      // Override MediaSession seek details explicitly
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            this.seek(details.seekTime);
          }
        });
      }

      this.applyAllSettings();
    } catch (e) {
      console.error('[AudioEngine] initialization failed:', e);
    }
  }

  /** Re-apply every cached setting once the audio graph exists. */
  private applyAllSettings() {
    if (!this.graph) return;
    this.applyVolume();
    // Pan
    try { this.setPan(this.pan); } catch {}
    // EQ: prefer explicit per-band gains, else the named preset
    try {
      if (this.eqBypass) {
        this.setEqBypass(true);
      } else if (this.eqGains && this.eqGains.length === 10) {
        this.eqGains.forEach((db, i) => {
          this.graph!.setEqGain(i, db);
        });
      } else if (this.eqPreset) {
        this.setEqPreset(this.eqPreset);
      }
    } catch {}
    // Playback rate is on the media elements (already safe), re-assert anyway
    try { this.setRate(this.rate); } catch {}
  }

  public async resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public getActiveAudio(): HTMLAudioElement {
    return this.audio;
  }

  public async load(track: Track, opts?: { autoplay?: boolean }): Promise<void> {
    this.init();
    await this.resumeContext();

    this.currentTrack = track;

    // Direct assignment and loading
    this.audio.src = track.src;
    this.audio.load();

    setMediaSessionMetadata(track);

    if (opts?.autoplay) {
      await this.play();
    } else {
      this.setPlayState(false);
    }
  }

  public async play(): Promise<void> {
    this.init();
    await this.resumeContext();

    try {
      await this.audio.play();
      this.setPlayState(true);
      setMediaSessionPlaybackState('playing');
    } catch (error) {
      console.error('[AudioEngine] Play failed', error);
      this.setPlayState(false);
      setMediaSessionPlaybackState('paused');
    }
  }

  public pause(): void {
    this.audio.pause();
    this.setPlayState(false);
    setMediaSessionPlaybackState('paused');
  }

  public toggle(): void {
    if (this.isPlayingState) {
      this.pause();
    } else {
      this.play().catch(() => {});
    }
  }

  public seek(sec: number): void {
    if (Number.isFinite(sec)) {
      this.audio.currentTime = sec;
      setMediaSessionPlaybackPosition(this.audio.currentTime, this.audio.duration || 0);
    }
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolume();
  }

  public setRate(rate: number): void {
    this.rate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
      this.audio.preservesPitch = true;
    }
  }

  public setPan(p: number): void {
    this.pan = p;
    if (this.graph) {
      this.graph.setPan(p);
    }
  }

  public setEqGain(index: number, db: number): void {
    if (index >= 0 && index < this.eqGains.length) {
      this.eqGains[index] = db;
    }
    if (this.graph) {
      this.graph.setEqGain(index, db);
    }
  }

  public setEqPreset(name: string): void {
    this.eqPreset = name;
    const preset = EQ_PRESETS[name];
    if (preset) {
      preset.forEach((db, i) => {
        this.eqGains[i] = db;
        if (this.graph) {
          this.graph.setEqGain(i, db);
        }
      });
    }
  }

  public setEqBypass(b: boolean): void {
    this.eqBypass = b;
    if (this.graph) {
      this.graph.setEqBypass(b);
    }
  }

  public setCrossfadeSec(_s: number): void {
    // No-op for simple engine
  }

  public setLoop(start: number | null, end: number | null): void {
    this.loopStart = start;
    this.loopEnd = end;
  }

  public preloadNext(_track: Track): void {
    // No-op for simple engine
  }

  public getAnalyser(): AnalyserNode | null {
    return this.graph ? this.graph.analyser : null;
  }

  public getStereoAnalysers() {
    if (!this.graph) return null;
    return {
      left: this.graph.analyserL,
      right: this.graph.analyserR
    };
  }

  public get currentTrackId(): string | undefined {
    return this.currentTrack?.id;
  }

  public get currentTrackData(): Track | null {
    return this.currentTrack;
  }

  private handleError() {
    if (!this.audio.src) return;

    if (this.currentTrack && this.audio.src === this.currentTrack.src && this.currentTrack.srcFallback) {
      console.warn(`[AudioEngine] Primay source failed for track ${this.currentTrack.title}. Falling back to jsDelivr...`);
      this.audio.src = this.currentTrack.srcFallback;
      this.audio.load();
      if (this.isPlayingState) {
        this.audio.play().catch(() => {});
      }
    } else {
      const errMsg = this.audio.error ? this.audio.error.message : 'Network/Source Error';
      console.error(`[AudioEngine] Audio channel failed to load source`, errMsg);
      if (this.onTrackError) {
        this.onTrackError(errMsg);
      }
    }
  }

  private handleEnded() {
    if (this.onEnded) {
      this.onEnded();
    }
  }

  private setPlayState(playing: boolean) {
    this.isPlayingState = playing;
    if (this.onPlayState) {
      this.onPlayState(playing);
    }

    if (playing) {
      this.startTimeReporting();
    } else {
      this.stopTimeReporting();
    }
  }

  private startTimeReporting() {
    this.stopTimeReporting();
    const update = () => {
      if (this.audio && this.onTimeUpdate) {
        const buffered = this.audio.buffered.length > 0 ? this.audio.buffered.end(this.audio.buffered.length - 1) : 0;
        
        // Check A-B loop
        if (this.loopStart !== null && this.loopEnd !== null) {
          if (this.audio.currentTime >= this.loopEnd) {
            this.audio.currentTime = this.loopStart;
          }
        }

        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0, buffered);
        setMediaSessionPlaybackPosition(this.audio.currentTime, this.audio.duration || 0);
      }
      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);
  }

  private stopTimeReporting() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private applyVolume() {
    if (!this.graph) return;
    const computedVolume = this.muted ? 0 : Math.pow(this.volume, 2); // Logarithmic feel
    this.graph.masterGain.gain.setValueAtTime(computedVolume, this.ctx ? this.ctx.currentTime : 0);
  }
}

export const audioEngine = new AudioEngine();
