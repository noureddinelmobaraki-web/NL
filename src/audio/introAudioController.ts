import { getHlsClass } from './hlsPool';
import { audioManager } from './audioManager';
import { INTRO_MUSIC_HLS } from '../constants/assets';

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
 */
class IntroAudioController {
  private audio: HTMLAudioElement | null = null;
  private setupStarted = false;
  private volume = 0.6;
  private readonly src = INTRO_MUSIC_HLS;

  ensureSetup(volume = 0.6): void {
    this.volume = volume;
    if (typeof window === 'undefined') return;
    if (this.setupStarted) return;
    this.setupStarted = true;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0; // audioManager controls the fade target
    this.audio = audio;

    audioManager.register('intro', audio, this.volume);
    void this.setupStream();
  }

  private async setupStream(): Promise<void> {
    const audio = this.audio;
    if (!audio) return;
    try {
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = this.src;
        audio.load();
        return;
      }
      const Hls = await getHlsClass();
      if (!this.audio) return;
      if (Hls.isSupported()) {
        // Dedicated VOD config (NOT the live low-latency pool config).
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          backBufferLength: 30,
          startPosition: 0,
        }) as unknown as HlsLike;
        hls.loadSource(this.src); // prefetch manifest now => fast first press
        hls.attachMedia(audio);
      } else {
        audio.src = this.src;
        audio.load();
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
    this.ensureSetup(this.volume);
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
    audioManager.pause('intro', fadeMs);
  }

  fadeOut(ms = 800): void {
    audioManager.pause('intro', ms);
  }

  isActive(): boolean {
    return audioManager.isSourceActive('intro');
  }
}

export const introAudioController = new IntroAudioController();
