import { getHlsClass } from './hlsPool';
import { audioManager } from './audioManager';
import { INTRO_MUSIC_SRC } from '../constants/assets';

type HlsLike = {
  loadSource: (u: string) => void;
  attachMedia: (el: HTMLMediaElement) => void;
  destroy: () => void;
};

/**
 * Single owner of the audioManager 'intro' source.
 * Both the welcome-screen speaker (useIntroAudio) and the in-page
 * "Intro Music" button (useIntroMusic) delegate to this one controller,
 * so there is never a registration conflict.
 *
 * PERFORMANCE: this controller is now fully LAZY. Nothing is fetched at page
 * load. The <audio> element uses preload="none" and the media bytes are only
 * requested the first time the user actually presses a sound button (play()).
 * The source is a plain progressive .m4a (not HLS), so a single request streams
 * it on demand.
 */
class IntroAudioController {
  private audio: HTMLAudioElement | null = null;
  private setupStarted = false;
  private sourceWired = false;
  private volume = 0.6;
  private readonly src = INTRO_MUSIC_SRC;

  // Optimistic "is the user asking for intro music?" flag. It flips the button
  // instantly on the first press, instead of waiting for the audio bytes to
  // buffer. audioManager only marks 'intro' active AFTER playback truly starts,
  // which — with a lazy preload='none' stream — was the 1-to-3 press lag bug.
  private desired = false;
  private desiredListeners = new Set<() => void>();
  private amStateUnsub: (() => void) | null = null;

  /** Subscribe to optimistic desired-flag changes (for useSyncExternalStore). */
  subscribeDesired = (cb: () => void): (() => void) => {
    this.desiredListeners.add(cb);
    return () => { this.desiredListeners.delete(cb); };
  };

  /** Current optimistic desired flag (stable ref for useSyncExternalStore). */
  getDesired = (): boolean => this.desired;

  private setDesired(next: boolean): void {
    if (this.desired === next) return;
    this.desired = next;
    this.desiredListeners.forEach((cb) => cb());
  }

  ensureSetup(volume = 0.6): void {
    this.volume = volume;
    if (typeof window === 'undefined') return;
    if (this.setupStarted) return;
    this.setupStarted = true;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.preload = 'none'; // <- do NOT fetch anything until the user presses play
    audio.volume = 0; // audioManager controls the fade target
    this.audio = audio;

    audioManager.register('intro', audio, this.volume);
    // NOTE: we intentionally do NOT wire/prefetch the source here.

    // Reconcile the optimistic flag if a higher-priority source ever steals the
    // 'intro' slot: if we still "want" intro but another source became active,
    // drop the desired flag so the button reflects reality.
    if (!this.amStateUnsub) {
      this.amStateUnsub = audioManager.subscribeState('intro', () => {
        if (!this.desired) return;
        if (audioManager.isSourceActive('intro')) return;
        const current = audioManager.getCurrentActive();
        if (current && current !== 'intro') this.setDesired(false);
      });
    }
  }

  /** Attach the media source. Called lazily from play() (inside a user gesture). */
  private async wireSource(): Promise<void> {
    const audio = this.audio;
    if (!audio || this.sourceWired) return;
    this.sourceWired = true;
    try {
      // Progressive file (default): a single on-demand request, no preloading.
      if (!this.src.endsWith('.m3u8')) {
        audio.src = this.src;
        return;
      }
      // HLS fallback (kept for compatibility if the source is ever a manifest).
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = this.src;
        return;
      }
      const Hls = await getHlsClass();
      if (!this.audio) return;
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          backBufferLength: 30,
          startPosition: 0,
        }) as unknown as HlsLike;
        hls.loadSource(this.src);
        hls.attachMedia(audio);
      } else {
        audio.src = this.src;
      }
    } catch {
      /* swallow: control becomes inert if the stream cannot load */
    }
  }

  private resumeAudioContexts(): void {
    const AC =
      (window as unknown as Record<string, unknown>).AudioContext ||
      (window as unknown as Record<string, unknown>).webkitAudioContext;
    if (!AC) return;
    const w = window as unknown as Record<string, { state?: string; resume?: () => Promise<void> }>;
    [w.audioContext, w.audioCtx, w.moodAudioContext, w.moodAudioCtx].forEach((c) => {
      if (c && c.state === 'suspended') c.resume?.().catch(() => {});
    });
  }

  async play(): Promise<void> {
    // Flip the button state IMMEDIATELY (optimistic), inside the user gesture,
    // so it never looks "off" while the first bytes are still buffering.
    this.setDesired(true);
    this.ensureSetup(this.volume);
    await this.wireSource(); // fetch the media only now, on the user's press
    const audio = this.audio;
    if (!audio) return;
    this.resumeAudioContexts();
    // Set element volume directly inside the user gesture (do not rely only on fade).
    audio.muted = false;
    audio.volume = this.volume;
    try {
      const p = audio.play();
      // Explicit user action => bypass the priority gate.
      audioManager.play('intro', { force: true }).catch(() => {});
      if (p) await p;
    } catch {
      const retry = () => {
        this.audio
          ?.play()
          .then(() => {
            audioManager.play('intro', { force: true }).catch(() => {});
          })
          .catch(() => {});
        window.removeEventListener('pointerdown', retry, true);
      };
      window.addEventListener('pointerdown', retry, { capture: true, once: true });
    }
  }

  pause(fadeMs = 800): void {
    this.setDesired(false);
    audioManager.pause('intro', fadeMs);
  }

  fadeOut(ms = 800): void {
    this.setDesired(false);
    audioManager.pause('intro', ms);
  }

  isActive(): boolean {
    return audioManager.isSourceActive('intro');
  }
}

export const introAudioController = new IntroAudioController();
