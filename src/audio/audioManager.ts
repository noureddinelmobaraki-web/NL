type AudioSource = 'bg' | 'song' | 'lens' | 'video' | 'mebit';

interface AudioEntry {
  source: AudioSource;
  element: HTMLAudioElement;
  volume: number;
}

class AudioManager {
  private active: AudioSource | null = null;
  private registry = new Map<AudioSource, AudioEntry>();
  private bgSuspended = false; // suspended by other source (NOT by user)
  private bgUserPaused = false; // user explicitly paused bg
  private fadeIntervals = new Map<HTMLAudioElement, NodeJS.Timeout>();
  private onStateChange: ((isPlaying: boolean) => void) | null = null;

  setStateCallback(cb: (isPlaying: boolean) => void) {
    this.onStateChange = cb;
  }

  register(source: AudioSource, element: HTMLAudioElement, volume = 0.7) {
    this.registry.set(source, { source, element, volume });
  }

  async play(source: AudioSource): Promise<void> {
    const entry = this.registry.get(source);
    if (!entry) return;

    // Cancel any in-progress fade on the incoming element
    this.clearFade(entry.element);

    // If already playing this source — no-op
    if (this.active === source && !entry.element.paused && entry.element.volume > 0) {
      if (source === 'bg') this.onStateChange?.(true);
      return;
    }

    // Fade out previous active source (fire-and-forget)
    if (this.active && this.active !== source) {
      const prev = this.registry.get(this.active);
      if (prev) this.fadeOut(prev.element, 250); // no await
    }

    // Suspend bg in parallel (fire-and-forget)
    if (source !== 'bg') {
      this.bgSuspended = true;
      const bg = this.registry.get('bg');
      if (bg && !bg.element.paused) {
        this.fadeOut(bg.element, 250).then(() => { // no await
          bg.element.pause();
          this.onStateChange?.(false);
        });
      }
    }

    // Start new source immediately — zero delay from here
    this.active = source;
    if (entry.element.paused) {
      entry.element.volume = 0;
      try {
        await entry.element.play();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.warn('[AudioManager]', e);
        return;
      }
    }
    if (source === 'bg') this.onStateChange?.(true);
    await this.fadeIn(entry.element, entry.volume, 400);
  }

  pause(source: AudioSource): void {
    const entry = this.registry.get(source);
    if (!entry) return;

    this.fadeOut(entry.element, 300).then(() => {
      entry.element.pause();
      entry.element.volume = 0; // reset volume so next play() starts clean
      // Only resume bg after the source is fully paused
      if (source !== 'bg' && !this.bgUserPaused) {
        this.bgSuspended = false;
        this.resumeBg();
      }
    });

    if (source === 'bg') {
      this.bgUserPaused = true;
      this.onStateChange?.(false);
    }

    if (source === this.active) {
      this.active = null;
      // NOTE: do NOT call resumeBg() here — it runs inside the .then() above
      // after the fade actually completes. This was the overlap bug.
    }
  }

  unpauseBg() {
    this.bgUserPaused = false;
    if (!this.bgSuspended) this.resumeBg();
  }

  private async resumeBg() {
    const bg = this.registry.get('bg');
    if (!bg || this.bgUserPaused || this.bgSuspended) return;
    
    this.active = 'bg';
    if (bg.element.paused) {
      bg.element.volume = 0;
      try {
        await bg.element.play();
      } catch (_) {
        return;
      }
    }
    this.onStateChange?.(true);
    await this.fadeIn(bg.element, bg.volume, 800);
  }

  private fadeOut(el: HTMLAudioElement, ms: number): Promise<void> {
    this.clearFade(el);
    return new Promise(resolve => {
      const start = el.volume;
      if (start <= 0) return resolve();
      
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
