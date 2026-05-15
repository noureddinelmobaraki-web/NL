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

    if (this.active === source && !entry.element.paused && entry.element.volume > 0) {
      if (source === 'bg') this.onStateChange?.(true);
      return;
    }

    // 🚀 fadeOut القديم في الخلفية — لا ننتظره (parallel)
    if (this.active && this.active !== source) {
      const current = this.registry.get(this.active);
      if (current) {
        this.fadeOut(current.element, 300).then(() => current.element.pause());
      }
    }

    if (source !== 'bg') {
      this.bgSuspended = true;
      const bg = this.registry.get('bg');
      if (bg && !bg.element.paused) {
        this.fadeOut(bg.element, 300).then(() => {
          bg.element.pause();
          this.onStateChange?.(false);
        });
      }
    }

    this.active = source;

    if (entry.element.paused) {
      entry.element.volume = 0; // يبدأ بصمت ثم يعمل fadeIn
      try {
        await entry.element.play();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.warn('[AudioManager]', e);
        return;
      }
    }

    if (source === 'bg') this.onStateChange?.(true);
    this.fadeIn(entry.element, entry.volume, 600);
  }

  pause(source: AudioSource) {
    const entry = this.registry.get(source);
    if (!entry) return;
    
    this.fadeOut(entry.element, 300).then(() => {
      entry.element.pause();
    });

    if (source === 'bg') {
      this.bgUserPaused = true;
      this.onStateChange?.(false);
    }

    if (source === this.active) {
      this.active = null;
      if (source !== 'bg' && !this.bgUserPaused) {
        this.bgSuspended = false;
        this.resumeBg();
      }
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
