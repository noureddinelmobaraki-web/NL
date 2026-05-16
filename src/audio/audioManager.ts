type AudioSource = 'bg' | 'song' | 'lens' | 'video' | 'mebit';

interface AudioEntry {
  source: AudioSource;
  element: HTMLAudioElement;
  volume: number;
  pendingPlay: boolean;
  _cleanup?: () => void;
}

class AudioManager {
  private active: AudioSource | null = null;
  private registry = new Map<AudioSource, AudioEntry>();
  private bgSuppressors = new Set<string>(); // Rule 3: BG Suppression mechanisms
  private bgUserPaused = false;
  private fadeIntervals = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>();
  private onStateChange: ((isPlaying: boolean) => void) | null = null;

  setStateCallback(cb: (isPlaying: boolean) => void) {
    this.onStateChange = cb;
  }

  register(source: AudioSource, element: HTMLAudioElement, volume = 0.7) {
    // Rule 7 Cleanup: Ensure initial state is silent and clean up previous listeners if any
    const existing = this.registry.get(source);
    if (existing && existing.element !== element) {
      this.clearFade(existing.element);
      existing._cleanup?.();
    }

    const entry: AudioEntry = { source, element, volume, pendingPlay: false };
    this.registry.set(source, entry);

    const onCanPlay = () => {
      // Re-verify it's still the active element for this source
      const current = this.registry.get(source);
      if (current && current.element === element && current.pendingPlay) {
        current.pendingPlay = false;
        this.executePlay(current);
      }
    };

    element.addEventListener('canplay', onCanPlay);
    entry._cleanup = () => element.removeEventListener('canplay', onCanPlay);
    
    // Rule 9: Immediate Check - if already ready, and we somehow got here with pending play
    if (element.readyState >= 2 && entry.pendingPlay) {
      onCanPlay();
    }

    element.volume = 0;
  }

  async play(source: AudioSource): Promise<void> {
    const entry = this.registry.get(source);
    if (!entry) return;

    // Rule 2 Hierarchy Check
    if (this.active && this.active !== source) {
      const currentPriority = this.getPriority(this.active);
      const incomingPriority = this.getPriority(source);
      
      // If incoming is lower priority, it CANNOT interrupt.
      if (incomingPriority < currentPriority) {
        console.warn(`[AudioManager] Incoming ${source} (p:${incomingPriority}) cannot interrupt ${this.active} (p:${currentPriority})`);
        return;
      }

      // Rule 1: Single Active Source - silencing lower priority active source
      const prev = this.registry.get(this.active);
      if (prev) {
        // Fast fade out for interruption (150ms)
        this.fadeOut(prev.element, 150); 
      }
    }

    // Rule 3: BG Suppression logic
    if (source !== 'bg') {
      this.suppressBg(`active_${source}`);
    }

    // Rule 4: Slow connection check (HAVE_CURRENT_DATA = 2)
    if (entry.element.readyState < 2) {
      entry.pendingPlay = true;
      return;
    }

    await this.executePlay(entry);
  }

  private getPriority(source: AudioSource): number {
    const priorities: Record<AudioSource, number> = {
      'song': 10,  // highest
      'lens': 8,
      'mebit': 8,
      'video': 5,
      'bg': 1
    };
    return priorities[source] || 0;
  }

  private async executePlay(entry: AudioEntry) {
    // Rule 5: Clear any existing fades before starting
    this.clearFade(entry.element);

    if (entry.element.paused) {
      entry.element.volume = 0;
      try {
        await entry.element.play();
      } catch (e) {
        // Rule 6: Play Failure Isolation
        console.warn(`[AudioManager] Play blocked for ${entry.source}:`, e);
        entry.pendingPlay = false;
        return; 
      }
    }

    // Rule 1/6: Set active only after confirmed playing
    this.active = entry.source;
    if (entry.source === 'bg') this.onStateChange?.(true);

    // Instant response for user-triggered playback, smooth for background
    let fadeDuration = 200;
    if (entry.source === 'bg') fadeDuration = 800;
    else if (entry.source === 'song' || entry.source === 'mebit' || entry.source === 'lens') fadeDuration = 50; 
    
    await this.fadeIn(entry.element, entry.volume, fadeDuration);
  }

  pause(source: AudioSource): void {
    const entry = this.registry.get(source);
    if (!entry) return;

    entry.pendingPlay = false;

    // Faster fade out for manual pause (200ms)
    this.fadeOut(entry.element, 200).then(() => {
      entry.element.pause();
      // Rule 7: Volume Reset on Pause
      entry.element.volume = 0;
      
      if (source !== 'bg') {
        this.releaseBg(`active_${source}`);
      }
    });

    if (source === 'bg') {
      this.bgUserPaused = true;
      this.onStateChange?.(false);
    }

    if (source === this.active) {
      this.active = null;
    }
  }

  unpauseBg() {
    this.bgUserPaused = false;
    this.checkResumeBg();
  }

  // Rule 3 additions
  suppressBg(reason: string) {
    this.bgSuppressors.add(reason);
    const bg = this.registry.get('bg');
    if (bg && (this.active === 'bg' || !bg.element.paused)) {
      // Faster fade for background suppression (150ms)
      this.fadeOut(bg.element, 150).then(() => {
        bg.element.pause();
        bg.element.volume = 0;
        if (this.active === 'bg') this.active = null;
        this.onStateChange?.(false);
      });
    }
  }

  releaseBg(reason: string) {
    this.bgSuppressors.delete(reason);
    this.checkResumeBg();
  }

  private checkResumeBg() {
    if (this.bgSuppressors.size === 0 && !this.bgUserPaused && !this.active) {
      this.resumeBg();
    }
  }

  private async resumeBg() {
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
    this.active = 'bg';
    this.onStateChange?.(true);
    await this.fadeIn(bg.element, bg.volume, 800);
  }

  isSourceActive(source: AudioSource): boolean {
    return this.active === source;
  }

  getCurrentActive(): AudioSource | null {
    return this.active;
  }

  private fadeOut(el: HTMLAudioElement, ms: number): Promise<void> {
    this.clearFade(el);
    return new Promise(resolve => {
      const start = el.volume;
      if (start <= 0) {
        el.volume = 0;
        return resolve();
      }
      
      const step = start / (ms / 16);
      const iv = setInterval(() => {
        el.volume = Math.max(el.volume - step, 0);
        if (el.volume <= 0) {
          this.clearFade(el);
          resolve(); 
        }
      }, 16);
      this.fadeIntervals.set(el, iv);
    });
  }

  private fadeIn(el: HTMLAudioElement, target: number, ms: number): Promise<void> {
    this.clearFade(el);
    return new Promise(resolve => {
      if (el.volume >= target) return resolve();
      
      const step = (target - el.volume) / (ms / 16);
      const iv = setInterval(() => {
        el.volume = Math.min(el.volume + step, target);
        if (el.volume >= target) {
          this.clearFade(el);
          resolve();
        }
      }, 16);
      this.fadeIntervals.set(el, iv);
    });
  }

  private clearFade(el: HTMLAudioElement) {
    const iv = this.fadeIntervals.get(el);
    if (iv) {
      clearInterval(iv);
      this.fadeIntervals.delete(el);
    }
  }
}

export const audioManager = new AudioManager();
