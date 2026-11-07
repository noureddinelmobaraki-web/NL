import { nowPlayingBus } from './nowPlayingBus';
import {
  __IS_DEV__,
  amLog,
  buildDiagnosticsSnapshot,
  clearAudioFade,
  fadeVolume,
  getAudioPriority,
  getFadeDurationForSource,
  NP_LABELS,
  RICH_NP,
  waitForCanPlay,
  withTimeout,
  type AudioEntry,
  type AudioManagerDiagnostics,
  type AudioSource,
  type ExternalSource,
} from './audioHelpers';
import { BgSuppressionRegistry } from './bgSuppressionRegistry';

export type { AudioManagerDiagnostics, AudioSource, ExternalSource };

class AudioManager {
  private active: AudioSource | null = null;
  private registry = new Map<AudioSource, AudioEntry>();
  private externals = new Map<AudioSource, ExternalSource>();
  // Rule 3: BG Suppression mechanisms — Map-based with metadata (P01.1)
  private readonly suppressions = new BgSuppressionRegistry(() => this.checkResumeBg());
  private get bgSuppressors() { return this.suppressions.map; }
  private set bgSuppressors(next: typeof this.suppressions.map) {
    this.suppressions.map.clear();
    for (const [k, v] of next) this.suppressions.map.set(k, v);
  }
  private bgUserPaused = false;
  private fadeIntervals = new Map<HTMLAudioElement, number>();
  private onStateChange: ((isPlaying: boolean) => void) | null = null;
  private manifestParsedCallbacks = new Set<() => void>();
  private isManifestParsed = false;
  private playChain: Promise<void> = Promise.resolve();
  private stateSubscribers = new Map<AudioSource, Set<() => void>>();

  private static readonly PLAY_STEP_TIMEOUT_MS = 5_000;

  private visibilityListenersInstalled = false;
  private pendingGestureResume = false;
  private lastRecoverAt = 0;

  private masterMuted = false;
  private muteSubscribers = new Set<() => void>();
  private activeSubscribers = new Set<() => void>();

  /** يسجّل مشغّلاً خارجياً (لا يملك <audio> داخل المدير) ليخضع للأولويات. */
  registerExternal(source: AudioSource, ctrl: ExternalSource): () => void {
    this.externals.set(source, ctrl);
    return () => { this.externals.delete(source); };
  }

  /** يجعل `source` حصرياً: يوقف كل مصدر آخر أقلّ أو يساوي أولويةً (داخلي وخارجي) ويكبت bg. */
  requestExclusive(source: AudioSource, reason = `excl_${source}`): void {
    const myPrio = this.getPriority(source);
    for (const [src, ctrl] of this.externals) {
      if (src === source) continue;
      if (this.getPriority(src) <= myPrio && ctrl.isPlaying()) {
        try { ctrl.pause(); } catch {}
      }
    }
    if (this.active && this.active !== source && this.getPriority(this.active) <= myPrio) {
      this.pause(this.active);
    }
    this.suppressBg(reason);
  }

  /** يُنهي الحصرية ويعيد الخلفية (والمشغّلات الخارجية التي تدعم resume إن رغبت). */
  releaseExclusive(reason = `excl`): void {
    this.releaseBg(reason);
  }

  constructor() {
    this.installVisibilityListenersIfBrowser();
  }

  subscribeState(source: AudioSource, cb: () => void): () => void {
    if (!this.stateSubscribers.has(source)) this.stateSubscribers.set(source, new Set());
    this.stateSubscribers.get(source)!.add(cb);
    return () => {
      this.stateSubscribers.get(source)?.delete(cb);
    };
  }

  private notifyStateChange(source: AudioSource) {
    this.stateSubscribers.get(source)?.forEach(cb => cb());
  }

  private setActive(source: AudioSource | null) {
    if (this.active === source) return;
    const oldActive = this.active;
    this.active = source;
    if (oldActive) this.notifyStateChange(oldActive);
    if (source) this.notifyStateChange(source);
    this.syncNowPlaying(source);
    this.activeSubscribers.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
  }

  /** ينشر تحكّمًا عالميًا في النوتش لأي مصدر شغّال ليس له ناشر غنيّ. */
  private syncNowPlaying(source: AudioSource | null): void {
    if (source && source !== 'bg' && !RICH_NP.has(source)) {
      const songExt = this.externals.get('song');
      if (songExt && songExt.isPlaying()) return;
      const label = NP_LABELS[source] ?? source;
      nowPlayingBus.publish({
        source,
        title: label,
        isPlaying: true,
        controls: {
          toggle: () => { if (this.isSourceActive(source)) this.pause(source); else void (this.play as any)(source); },
          stop: () => { this.stop(source); },
        },
      });
      return;
    }
    if (!source) {
      const cur = nowPlayingBus.get();
      if (cur && !RICH_NP.has(cur.source)) nowPlayingBus.clear(cur.source);
    }
  }

  triggerManifestParsed() {
    this.isManifestParsed = true;
    this.manifestParsedCallbacks.forEach(cb => cb());
  }

  onManifestParsed(cb: () => void): () => void {
    if (this.isManifestParsed) {
      cb();
    }
    this.manifestParsedCallbacks.add(cb);
    return () => {
      this.manifestParsedCallbacks.delete(cb);
    };
  }

  setStateCallback(cb: (isPlaying: boolean) => void) {
    this.onStateChange = cb;
  }

  register(source: AudioSource, element: HTMLAudioElement, volume = 0.7) {
    const existing = this.registry.get(source);
    if (existing) {
      this.clearFade(existing.element);
      existing._cleanup?.();
      existing.pendingPlay = false;
      if (existing.element !== element) {
        try {
          existing.element.pause();
          existing.element.volume = 0;
        } catch {}
      }
    }

    const generation = (existing?.generation ?? 0) + 1;
    const entry: AudioEntry = { source, element, volume, pendingPlay: false, generation };
    this.registry.set(source, entry);

    const onCanPlay = () => {
      const current = this.registry.get(source);
      if (
        current &&
        current.element === element &&
        current.generation === generation &&
        current.pendingPlay
      ) {
        current.pendingPlay = false;
        this.executePlay(current, generation);
      }
    };

    entry._cleanup = waitForCanPlay(element, entry, onCanPlay);
    element.volume = 0;
    element.muted = this.masterMuted;
  }

  isRegistered(source: AudioSource): boolean {
    return this.registry.has(source);
  }

  isMuted(): boolean { return this.masterMuted; }
  setMuted(muted: boolean): void {
    if (this.masterMuted === muted) return;
    this.masterMuted = muted;
    this.registry.forEach((e) => { try { e.element.muted = muted; } catch { /* ignore */ } });
    if (typeof document !== 'undefined') {
      document.querySelectorAll('audio, video').forEach((el) => {
        try { (el as HTMLMediaElement).muted = muted; } catch { /* ignore */ }
      });
    }
    this.muteSubscribers.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
  }
  toggleMuted(): void { this.setMuted(!this.masterMuted); }
  subscribeMuted(cb: () => void): () => void {
    this.muteSubscribers.add(cb);
    return () => { this.muteSubscribers.delete(cb); };
  }

  subscribeActive(cb: () => void): () => void {
    this.activeSubscribers.add(cb);
    return () => { this.activeSubscribers.delete(cb); };
  }

  isSourceActive(source: AudioSource): boolean {
    return this.active === source;
  }

  getCurrentActive(): AudioSource | null {
    return this.active;
  }

  unregister(source: AudioSource): void {
    const existing = this.registry.get(source);
    if (!existing) return;

    this.clearFade(existing.element);
    existing._cleanup?.();
    existing.pendingPlay = false;
    try {
      existing.element.pause();
      existing.element.volume = 0;
    } catch {}

    this.registry.delete(source);

    if (source !== 'bg') {
      this.releaseBg(`active_${source}`);
    }

    if (this.active === source) {
      this.setActive(null);
    }
  }

  async play(source: AudioSource, opts?: { force?: boolean }): Promise<void> {
    if (source === 'bg' && typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) {
      return;
    }
    const run = async () => {
      const entry = this.registry.get(source);
      if (!entry) return;

      entry.generation += 1;
      const myGeneration = entry.generation;

      if (this.active && this.active !== source) {
        const currentPriority = this.getPriority(this.active);
        const incomingPriority = this.getPriority(source);

        if (!opts?.force && incomingPriority < currentPriority) {
          amLog.warn(`Incoming ${source} (p:${incomingPriority}) cannot interrupt ${this.active} (p:${currentPriority})`);
          return;
        }

        const prev = this.registry.get(this.active);
        if (prev) {
          this.clearFade(prev.element);
          try {
            prev.element.pause();
            prev.element.volume = 0;
          } catch {}
          prev.pendingPlay = false;
        }
      }

      if (source !== 'bg') {
        this.suppressBg(`active_${source}`);
      }

      if (entry.element.readyState < 2) {
        entry.pendingPlay = true;
        return;
      }

      await this.executePlay(entry, myGeneration);
    };

    const wrapped = () => this.withTimeout(
      Promise.resolve().then(run),
      AudioManager.PLAY_STEP_TIMEOUT_MS,
      `play(${source})`
    ).catch(err => {
      amLog.warn(`play(${source}) chain step error:`, err);
    });
    this.playChain = this.playChain.then(wrapped, wrapped);
    return this.playChain;
  }

  private getPriority(source: AudioSource): number {
    return getAudioPriority(source);
  }

  private async executePlay(entry: AudioEntry, expectedGeneration?: number) {
    const isStale = () =>
      expectedGeneration !== undefined &&
      this.registry.get(entry.source)?.generation !== expectedGeneration;

    if (isStale()) return;

    this.clearFade(entry.element);

    if (entry.element.paused) {
      entry.element.volume = 0;
      try {
        await entry.element.play();
      } catch (e) {
        amLog.warn(`Play blocked for ${entry.source}:`, e);
        entry.pendingPlay = false;
        return;
      }
    }

    if (isStale()) {
      try { entry.element.pause(); entry.element.volume = 0; } catch {}
      return;
    }

    this.setActive(entry.source);
    if (entry.source === 'bg') {
      this.bgUserPaused = false;
      this.onStateChange?.(true);
    }

    await this.fadeIn(entry.element, entry.volume, getFadeDurationForSource(entry.source));
  }

  pause(source: AudioSource, fadeMs?: number): void {
    const entry = this.registry.get(source);
    if (!entry) return;

    entry.pendingPlay = false;

    if (source === 'song') {
      this.clearFade(entry.element);
      entry.element.pause();
      entry.element.volume = 0;
      this.releaseBg('active_song');
    } else {
      const ms = fadeMs ?? (source === 'intro' ? 800 : 200);
      this.fadeOut(entry.element, ms).then(() => {
        entry.element.pause();
        entry.element.volume = 0;
        if (source !== 'bg') {
          this.releaseBg(`active_${source}`);
        }
      });
    }

    if (source === 'bg') {
      this.bgUserPaused = true;
      this.onStateChange?.(false);
    }

    if (source === this.active) {
      this.setActive(null);
    }
  }

  stop(source: AudioSource): void {
    const entry = this.registry.get(source);
    if (!entry) return;

    entry.pendingPlay = false;
    this.clearFade(entry.element);
    entry.element.pause();
    entry.element.volume = 0;

    if (source !== 'bg') {
      this.releaseBg(`active_${source}`);
    }

    if (source === 'bg') {
      this.bgUserPaused = true;
      this.onStateChange?.(false);
    }

    if (source === this.active) {
      this.setActive(null);
    }
  }

  unpauseBg() {
    this.bgUserPaused = false;
    this.checkResumeBg();
  }

  suppressBg(reason: string) {
    const myToken = this.suppressions.add(reason);

    const bg = this.registry.get('bg');
    if (!bg) return;
    if (!(this.active === 'bg' || !bg.element.paused)) return;

    this.fadeOut(bg.element, 150).then(() => {
      if (myToken !== this.suppressions.token) return;
      if (this.suppressions.size === 0) return;
      try {
        bg.element.pause();
        bg.element.volume = 0;
      } catch {}
      if (this.active === 'bg') this.setActive(null);
      this.onStateChange?.(false);
    });
  }

  releaseBg(reason: string) {
    this.suppressions.release(reason);
    this.checkResumeBg();
  }

  forceReleaseBgPrefix(prefix: string) {
    const removed = this.suppressions.forceReleasePrefix(prefix);
    if (removed > 0) {
      this.checkResumeBg();
    }
  }

  onSongEnd(): void {
    const songEntry = this.registry.get('song');
    if (songEntry) {
      songEntry.pendingPlay = false;
      this.clearFade(songEntry.element);
      try {
        songEntry.element.volume = 0;
      } catch {}
    }
    this.releaseBg('active_song');
    if (this.active === 'song') {
      this.setActive(null);
    }
  }

  private checkResumeBg() {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) return;
    if (this.bgSuppressors.size === 0 && !this.bgUserPaused && !this.active) {
      this.resumeBg();
    }
  }

  private async resumeBg() {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) return;
    const bg = this.registry.get('bg');
    if (!bg || this.bgUserPaused || this.bgSuppressors.size > 0 || this.active) return;

    if (bg.element.paused) {
      bg.element.volume = 0;
      try {
        await bg.element.play();
      } catch (_) {
        return;
      }
    }
    this.setActive('bg');
    this.onStateChange?.(true);
    await this.fadeIn(bg.element, bg.volume, 800);
  }

  diagnose(): AudioManagerDiagnostics {
    return buildDiagnosticsSnapshot(
      this.active,
      this.bgUserPaused,
      this.isManifestParsed,
      this.registry,
      this.bgSuppressors,
      this.stateSubscribers,
      this.fadeIntervals.size,
      this.manifestParsedCallbacks.size
    );
  }

  hasActiveSuppressor(reason?: string): boolean {
    return this.suppressions.has(reason);
  }

  forceReleaseBg(reason: string): number {
    const count = this.suppressions.forceRelease(reason);
    if (count > 0) {
      this.checkResumeBg();
    }
    return count;
  }

  recoverAudio(): void {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) return;
    const now = Date.now();
    if (now - this.lastRecoverAt < 400) return;
    this.lastRecoverAt = now;

    const staleSources: AudioSource[] = ['song', 'lens', 'video', 'mebit'];
    staleSources.forEach(src => {
      if (this.active !== src && this.hasActiveSuppressor(`active_${src}`)) {
        this.forceReleaseBg(`active_${src}`);
      }
    });

    if (this.bgSuppressors.size === 0) {
      if (this.active === 'bg') {
        const bg = this.registry.get('bg');
        if (bg && bg.element.paused && !this.bgUserPaused) {
          this.resumeBg();
        }
      } else {
        this.checkResumeBg();
      }
    }
  }

  purgeStaleSuppressors(): number {
    return this.suppressions.purgeStale();
  }

  private installVisibilityListenersIfBrowser(): void {
    if (this.visibilityListenersInstalled) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    this.visibilityListenersInstalled = true;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      this.handleVisibilityResume('visibilitychange');
    };

    const onPageShow = (e: PageTransitionEvent) => {
      this.handleVisibilityResume(e.persisted ? 'pageshow:bfcache' : 'pageshow');
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
  }

  private handleVisibilityResume(source: string): void {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) return;
    amLog.info(`visibility resume trigger: ${source}`);
    const bg = this.registry.get('bg');
    if (!bg || this.bgUserPaused || this.bgSuppressors.size > 0 || (this.active && this.active !== 'bg')) return;

    bg.element.play().then(() => {
      this.setActive('bg');
      this.onStateChange?.(true);
      this.fadeIn(bg.element, bg.volume, 400);
    }).catch((err: unknown) => {
      amLog.warn(`visibility resume blocked, arming gesture (${(err as Error)?.name})`);
      this.armUserGestureResume();
    });
  }

  armUserGestureResume(): void {
    if (this.pendingGestureResume || typeof window === 'undefined') return;
    this.pendingGestureResume = true;

    const handler = () => {
      this.pendingGestureResume = false;
      this.suppressions.token++;
      const bg = this.registry.get('bg');
      if (!bg || this.bgUserPaused || this.bgSuppressors.size > 0 || (this.active && this.active !== 'bg')) {
        cleanup();
        return;
      }
      const playPromise = bg.element.play();
      this.setActive('bg');
      this.onStateChange?.(true);
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          this.fadeIn(bg.element, bg.volume, 400);
        }).catch(() => {});
      }
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchend', handler);
    };

    window.addEventListener('pointerdown', handler, { once: true, passive: true });
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('touchend', handler, { once: true, passive: true });
  }

  private withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return withTimeout(p, ms, label);
  }

  private fadeOut(el: HTMLAudioElement, ms: number): Promise<void> {
    return fadeVolume(this.fadeIntervals, el, 0, ms, 'out');
  }

  private fadeIn(el: HTMLAudioElement, target: number, ms: number): Promise<void> {
    return fadeVolume(this.fadeIntervals, el, target, ms, 'in');
  }

  private clearFade(el: HTMLAudioElement) {
    clearAudioFade(this.fadeIntervals, el);
  }
}

export const audioManager = new AudioManager();

if (__IS_DEV__ && typeof window !== 'undefined') {
  (window as any).audioManager = audioManager;
}
