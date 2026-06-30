type AudioSource =
  | 'bg' | 'song' | 'lens' | 'video' | 'mebit' | 'intro'
  | 'games' | 'movies' | 'series' | 'tv' | 'retro' | 'xp'
  | 'profile'   // أغنية بروفيل المستخدم (ThemeSongBar)
  | 'preview';  // معاينة أغنية داخل النوافذ (useSongPreview)

interface ExternalSource {
  pause: () => void;       // كيف يوقف هذا المصدر نفسه (مثلاً audioEngine.pause)
  isPlaying: () => boolean;
  resume?: () => void;     // اختياري: استئناف عند تحرّر الأولوية
}

/** Metadata لكل suppressor مسجَّل في bgSuppressors. */
interface SuppressorMeta {
  /** نص السبب الأصلي الممرَّر إلى suppressBg(). */
  reason: string;
  /** performance.now() لحظة التسجيل — يستخدم في stale purge. */
  ts: number;
}

/** Snapshot يُعاد من audioManager.diagnose() للقراءة من DevTools أو tests. */
export interface AudioManagerDiagnostics {
  active: AudioSource | null;
  bgUserPaused: boolean;
  isManifestParsed: boolean;
  registry: Array<{
    source: AudioSource;
    volume: number;
    pendingPlay: boolean;
    generation: number;
    paused: boolean;
    currentVolume: number;
    readyState: number;
    src: string;
  }>;
  suppressors: Array<{ reason: string; ageMs: number }>;
  subscriberCounts: Partial<Record<AudioSource, number>>;
  fadeIntervalsCount: number;
  manifestParsedCallbacks: number;
}

interface AudioEntry {
  source: AudioSource;
  element: HTMLAudioElement;
  volume: number;
  pendingPlay: boolean;
  generation: number;
  _cleanup?: () => void;
}

// ─── P01.2: DEV-only logger ─────────────────────────────────────────────
const __IS_DEV__ =
  typeof import.meta !== 'undefined' &&
  !!(import.meta as unknown as Record<string, any>)?.env?.DEV;

function __amLogEnabled(): boolean {
  if (__IS_DEV__) return true;
  try {
    return typeof localStorage !== 'undefined'
      && localStorage.getItem('NL_AM_LOG') === '1';
  } catch {
    return false;
  }
}

/** Lightweight DEV-only logger. لا يطبع شيئاً في production إلا عند تفعيل
 *  flag في localStorage. لا يعتمد على أي مكتبة خارجية. */
const amLog = {
  info:  (...args: unknown[]): void => { if (__amLogEnabled()) console.log('[AM]', ...args); },
  warn:  (...args: unknown[]): void => { if (__amLogEnabled()) console.warn('[AM]', ...args); },
  error: (...args: unknown[]): void => { if (__amLogEnabled()) console.error('[AM]', ...args); },
  group: (label: string): void => { if (__amLogEnabled()) console.group(`[AM] ${label}`); },
  groupEnd: (): void => { if (__amLogEnabled()) console.groupEnd(); },
};
// ────────────────────────────────────────────────────────────────────────

class AudioManager {
  private active: AudioSource | null = null;
  private registry = new Map<AudioSource, AudioEntry>();
  private externals = new Map<AudioSource, ExternalSource>();
  // Rule 3: BG Suppression mechanisms — Map-based with metadata (P01.1)
  // Key = reason string، Value = { reason, ts } لتمكين diagnose & purge.
  private bgSuppressors = new Map<string, SuppressorMeta>();
  private bgUserPaused = false;
  private fadeIntervals = new Map<HTMLAudioElement, number>(); // رقم rAF handle
  private onStateChange: ((isPlaying: boolean) => void) | null = null;
  private manifestParsedCallbacks = new Set<() => void>();
  private isManifestParsed = false;
  private playChain: Promise<void> = Promise.resolve();
  private stateSubscribers = new Map<AudioSource, Set<() => void>>();
  // P01.4: token لإلغاء fade-out المتأخر في suppressBg
  private suppressionToken = 0;

  // P01.5: stale suppressor purge
  private static readonly SUPPRESSOR_STALE_MS = 30_000;
  private static readonly SUPPRESSOR_PURGE_INTERVAL_MS = 5_000;
  // P01.8: play chain step timeout
  private static readonly PLAY_STEP_TIMEOUT_MS = 5_000;
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

  // P01.6: visibility recovery
  private visibilityListenersInstalled = false;
  private pendingGestureResume = false;
  private lastRecoverAt = 0;

  /** يسجّل مشغّلاً خارجياً (لا يملك <audio> داخل المدير) ليخضع للأولويات. */
  registerExternal(source: AudioSource, ctrl: ExternalSource): () => void {
    this.externals.set(source, ctrl);
    return () => { this.externals.delete(source); };
  }

  /** يجعل `source` حصرياً: يوقف كل مصدر آخر أقلّ أو يساوي أولويةً (داخلي وخارجي) ويكبت bg. */
  requestExclusive(source: AudioSource, reason = `excl_${source}`): void {
    const myPrio = this.getPriority(source);
    // (أ) أوقف المصادر الخارجية الأدنى/المساوية (مثل NL music) — لكن ليس نفسه
    for (const [src, ctrl] of this.externals) {
      if (src === source) continue;
      if (this.getPriority(src) <= myPrio && ctrl.isPlaying()) {
        try { ctrl.pause(); } catch {}
      }
    }
    // (ب) أوقف المصدر الداخلي النشط لو أولويته أدنى/مساوية
    if (this.active && this.active !== source && this.getPriority(this.active) <= myPrio) {
      this.pause(this.active);
    }
    // (ج) اكبت الخلفية ما دام هذا المصدر فعّالاً
    this.suppressBg(reason);
  }

  /** يُنهي الحصرية ويعيد الخلفية (والمشغّلات الخارجية التي تدعم resume إن رغبت). */
  releaseExclusive(reason = `excl`): void {
    this.releaseBg(reason);
  }

  constructor() {
    this.installVisibilityListenersIfBrowser();
  }

  /**
   * يشترك في التغييرات الطارئة على حالة تشغيل مصدر صوت معين.
   * يُفيد لمزامنة الـ UI مع بدء وإيقاف هذا المصدر.
   *
   * @param source - مصدر الصوت المستهدف.
   * @param cb - callback يُستدعى عند حدوث أي تغيير في الحالة.
   * @returns دالة لإلغاء الاشتراك (off).
   */
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
  }

  /**
   * يُشير إلى اكتمال تحميل وتحليل الـ manifest الخاص بالملفات الصوتية.
   * يستدعي جميع الـ callbacks المُسجلة عبر onManifestParsed.
   */
  triggerManifestParsed() {
    this.isManifestParsed = true;
    this.manifestParsedCallbacks.forEach(cb => cb());
  }

  /**
   * يُسجل callback ليتم استدعاؤه فور اكتمال تحليل الـ manifest.
   * إذا كان الـ manifest قد اكتمل تحليله بالفعل، يتم استدعاء الـ callback فوراً وبشكل متزامن.
   *
   * @param cb - الـ callback المطلوب تنفيذه.
   * @returns دالة لإلغاء التسجيل.
   */
  onManifestParsed(cb: () => void): () => void {
    if (this.isManifestParsed) {
      cb();
    }
    this.manifestParsedCallbacks.add(cb);
    return () => {
      this.manifestParsedCallbacks.delete(cb);
    };
  }

  /**
   * يُسجل callback شامل لحالة تشغيل موسيقى الخلفية (bg).
   * مُستخدَم لتحديث الـ UI الذي يتحكم في تشغيل الخلفية العامة.
   *
   * @param cb - الـ callback الذي يتلقى قيمة boolean تُعبّر عن تشغيل أو إيقاف الخلفية.
   */
  setStateCallback(cb: (isPlaying: boolean) => void) {
    this.onStateChange = cb;
  }

  /**
   * Register `<audio>` element لمصدر.
   * مكتمل في useEffect: استدعِ register() داخل، و unregister() في cleanup.
   * استدعاء register() ثانية لنفس source يستبدل الـ entry بأمان.
   */
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

    element.addEventListener('canplay', onCanPlay);
    entry._cleanup = () => element.removeEventListener('canplay', onCanPlay);
    
    // Rule 9: Immediate Check - if already ready, and we somehow got here with pending play
    if (element.readyState >= 2 && entry.pendingPlay) {
      onCanPlay();
    }

    element.volume = 0;
  }

  isRegistered(source: AudioSource): boolean {
    return this.registry.has(source);
  }

  /**
   * يفك تسجيل مصدر صوت. عكس register().
   * آمن للاستدعاء حتى لو لم يكن مسجَّلاً.
   *
   * تُستدعى عادةً من cleanup function لـ useEffect الذي سجَّل العنصر.
   */
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

  /**
   * يبدأ تشغيل مصدر. يحترم سياسة الأولوية (getPriority):
   * مصدر بأولوية أقل لا يقاطع مصدراً أعلى. عند نجاحه، يعلّق bg تلقائياً
   * إن كان source ≠ 'bg'.
   *
   * @param source — أحد 'bg' | 'song' | 'lens' | 'video' | 'mebit'
   * @param opts — خيارات إضافية (force).
   * @returns Promise يحلّ عند انتهاء معالجة الـ step في playChain.
   */
  async play(source: AudioSource, opts?: { force?: boolean }): Promise<void> {
    if (source === 'bg' && typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) {
      return;
    }
    const run = async () => {
      const entry = this.registry.get(source);
      if (!entry) return;

      entry.generation += 1;
      const myGeneration = entry.generation;

      // Rule 2 Hierarchy Check
      if (this.active && this.active !== source) {
        const currentPriority = this.getPriority(this.active);
        const incomingPriority = this.getPriority(source);
        
        // If incoming is lower priority, it CANNOT interrupt, unless forced.
        if (!opts?.force && incomingPriority < currentPriority) {
          amLog.warn(`Incoming ${source} (p:${incomingPriority}) cannot interrupt ${this.active} (p:${currentPriority})`);
          return;
        }

        // Rule 1: Single Active Source - silencing lower priority active source
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

      // Rule 3: BG Suppression logic
      if (source !== 'bg') {
        this.suppressBg(`active_${source}`);
      }

      // Rule 4: Slow connection check (HAVE_CURRENT_DATA = 2)
      if (entry.element.readyState < 2) {
        entry.pendingPlay = true;
        return;
      }

      await this.executePlay(entry, myGeneration);
    };

    // P01.8: wrap الـ step في timeout حتى لا يعلَق الـ chain.
    const wrapped = () => this.withTimeout(
      Promise.resolve().then(run),
      AudioManager.PLAY_STEP_TIMEOUT_MS,
      `play(${source})`
    ).catch(err => {
      amLog.warn(`play(${source}) chain step error:`, err);
      // لا re-throw — نريد الـ chain أن يستمر
    });
    this.playChain = this.playChain.then(wrapped, wrapped);
    return this.playChain;
  }

  private getPriority(source: AudioSource): number {
    const priorities: Record<AudioSource, number> = {
      'preview': 11, // المعاينة هي تفاعل مستخدم مباشر -> الأعلى
      'song': 10,  // highest
      'profile': 9,  // أغنية بروفيل المستخدم
      'intro': 4,
      'lens': 8,
      'mebit': 8,
      'games': 6,
      'movies': 6,
      'series': 6,
      'tv': 6,
      'retro': 6,
      'xp': 6,
      'video': 5,
      'bg': 1
    };
    return priorities[source] || 0;
  }

  private async executePlay(entry: AudioEntry, expectedGeneration?: number) {
    const isStale = () =>
      expectedGeneration !== undefined &&
      this.registry.get(entry.source)?.generation !== expectedGeneration;

    if (isStale()) return;

    // Rule 5: Clear any existing fades before starting
    this.clearFade(entry.element);

    if (entry.element.paused) {
      entry.element.volume = 0;
      try {
        await entry.element.play();
      } catch (e) {
        // Rule 6: Play Failure Isolation
        amLog.warn(`Play blocked for ${entry.source}:`, e);
        entry.pendingPlay = false;
        return; 
      }
    }

    if (isStale()) {
      try { entry.element.pause(); entry.element.volume = 0; } catch {}
      return;
    }

    // Rule 1/6: Set active only after confirmed playing
    this.setActive(entry.source);
    if (entry.source === 'bg') {
      this.bgUserPaused = false; // FIX: clear user-paused flag when bg starts
      this.onStateChange?.(true);
    }

    // Instant response for user-triggered playback, smooth for background
    let fadeDuration = 200;
    if (entry.source === 'bg' || entry.source === 'intro') fadeDuration = 800;
    else if (entry.source === 'song') fadeDuration = 0; // ZERO fade for songs
    else if (entry.source === 'mebit' || entry.source === 'lens') fadeDuration = 50; 
    
    await this.fadeIn(entry.element, entry.volume, fadeDuration);
  }



  /**
   * يقوم بإيقاف مصدر الصوت مؤقتاً.
   * يقوم بعمل خفض تدريجي للصوت (fade-out) بقيمة 200ms لمعظم المصادر، باستثناء 'song'.
   *
   * @param source - مصدر الصوت المراد إيقافه مؤقتاً.
   */
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
        // Rule 7: Volume Reset on Pause
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

  /**
   * يقوم بإيقاف مصدر الصوت فوراً وبشكل كامل دون أي خفض تدريجي (fade-out).
   * يُعيد ضبط مستوى صوت العنصر إلى 0.
   *
   * @param source - مصدر الصوت المراد إيقافه نهائياً.
   */
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

  /**
   * يلغي حالة إيقاف موسيقى الخلفية (bg) المفروضة من قبل المستخدم (bgUserPaused = false)
   * ثم يحاول استئناف تشغيلها إذا سمحت بقية العوامل (مثل عدم وجود suppressors).
   */
  unpauseBg() {
    this.bgUserPaused = false;
    this.checkResumeBg();
  }

  // Rule 3 additions
  /**
   * يعلّق موسيقى الخلفية لسبب معيَّن. مُستخدَم من قبل أقسام UI
   * (gallery, lens) لمنع تداخل bg. **يجب** أن يقابلها releaseBg(reason)
   * مع نفس الـ reason في cleanup. وإلا — يتم purge تلقائياً بعد
   * SUPPRESSOR_STALE_MS (30s).
   *
   * @param reason — مفتاح فريد للسبب (مثلاً 'lens_open').
   */
  suppressBg(reason: string) {
    // P01.1: تحديث ts إن كان نفس reason مسجَّل سابقاً (refresh idempotent).
    this.bgSuppressors.set(reason, { reason, ts: performance.now() });
    this.startPurgeTimerIfNeeded();

    const bg = this.registry.get('bg');
    if (!bg) return;
    if (!(this.active === 'bg' || !bg.element.paused)) return;

    // P01.4: token لتجنُّب سباق fade-out
    const myToken = ++this.suppressionToken;

    // Faster fade for background suppression (150ms)
    this.fadeOut(bg.element, 150).then(() => {
      // إذا بدأ suppress آخر بعدنا، أو تحرَّر الـ suppressor، أو bg
      // أُعيد تشغيله — اخرج بصمت.
      if (myToken !== this.suppressionToken) return;
      // إن لم يبقَ suppressor (تم release بسرعة)، أو تمّ activate شيء
      // آخر — لا ندخل في setActive(null).
      if (this.bgSuppressors.size === 0) return;
      try {
        bg.element.pause();
        bg.element.volume = 0;
      } catch {}
      if (this.active === 'bg') this.setActive(null);
      this.onStateChange?.(false);
    });
  }

  /**
   * يلغي تعليق موسيقى الخلفية لسبب معيّن (سبب سُجّل مسبقاً عبر suppressBg).
   * يزيد من قيمة suppressionToken لإبطال أي fade-out متأخر، ويتحقق من إمكانية استئناف الخلفية.
   *
   * @param reason - مفتاح السبب المراد إلغاؤه.
   */
  releaseBg(reason: string) {
    if (this.bgSuppressors.delete(reason)) {
      // P01.4: بطل أي fade-out معلَّق
      this.suppressionToken++;
    }
    if (this.bgSuppressors.size === 0) this.stopPurgeTimer();
    this.checkResumeBg();
  }

  /**
   * Safety belt: drop all bg suppressors that match a given prefix.
   * Used by MeBit session lifecycle to guarantee bg can resume even if
   * one of the symmetric release() calls was missed (e.g. Strict Mode double mount).
   */
  forceReleaseBgPrefix(prefix: string) {
    let removed = 0;
    for (const reason of this.bgSuppressors.keys()) {
      if (reason === prefix || reason.startsWith(prefix + ':')) {
        this.bgSuppressors.delete(reason);
        removed++;
      }
    }
    if (removed > 0) {
      this.suppressionToken++;
      if (this.bgSuppressors.size === 0) this.stopPurgeTimer();
      this.checkResumeBg();
    }
  }

  /**
   * Atomic cleanup when a song finishes naturally (ended event).
   * Releases the 'active_song' bg-suppressor AND clears active state if needed.
   * Idempotent — safe to call multiple times.
   */
  onSongEnd(): void {
    const songEntry = this.registry.get('song');
    if (songEntry) {
      songEntry.pendingPlay = false;
      this.clearFade(songEntry.element);
      try {
        songEntry.element.volume = 0;
      } catch {}
    }
    // The single source of truth that unblocks bg
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

  /**
   * يرجع ما إذا كان مصدر صوت معين هو النشط حالياً في AudioManager.
   *
   * @param source - مصدر الصوت المراد فحصه.
   * @returns true إذا كان المصدر نشطاً، وإلا false.
   */
  isSourceActive(source: AudioSource): boolean {
    return this.active === source;
  }

  /**
   * يرجع السورس النشط حالياً على AudioManager بشكل مباشر (أو null إذا لم يكن هناك مصدر نشط).
   *
   * @returns مصدر الصوت النشط أو null.
   */
  getCurrentActive(): AudioSource | null {
    return this.active;
  }

  // ─── P01.3: Diagnostics & Emergency API ───────────────────────────────

  /**
   * يُعيد snapshot كامل لحالة AudioManager. للقراءة من DevTools أو tests.
   * لا يُغيّر أي شيء (read-only). آمن في production.
   *
   * @example
   *   window.audioManager?.diagnose();
   */
  diagnose(): AudioManagerDiagnostics {
    const now = performance.now();
    const subscriberCounts: Partial<Record<AudioSource, number>> = {};
    this.stateSubscribers.forEach((set, src) => {
      subscriberCounts[src] = set.size;
    });

    return {
      active: this.active,
      bgUserPaused: this.bgUserPaused,
      isManifestParsed: this.isManifestParsed,
      registry: Array.from(this.registry.values()).map(e => ({
        source: e.source,
        volume: e.volume,
        pendingPlay: e.pendingPlay,
        generation: e.generation,
        paused: e.element.paused,
        currentVolume: e.element.volume,
        readyState: e.element.readyState,
        src: e.element.currentSrc || e.element.src || '',
      })),
      suppressors: Array.from(this.bgSuppressors.values()).map(m => ({
        reason: m.reason,
        ageMs: Math.round(now - m.ts),
      })),
      subscriberCounts,
      fadeIntervalsCount: this.fadeIntervals.size,
      manifestParsedCallbacks: this.manifestParsedCallbacks.size,
    };
  }

  /**
   * يفحص وجود suppressor.
   * @param reason — إن قُدِّم، يفحص هذا التحديد. إن غاب، يُعيد true لو كان أي suppressor.
   */
  hasActiveSuppressor(reason?: string): boolean {
    if (reason === undefined) return this.bgSuppressors.size > 0;
    return this.bgSuppressors.has(reason);
  }

  /**
   * إصدار "طوارئ" يُجبر تحرير suppressor واحد أو كلّها.
   * يختلف عن releaseBg في أنّه يطبع log واضح ولا يخفق صامتاً.
   *
   * @param reason — '*' لمسح كل suppressors، أو reason محدد.
   * @returns عدد suppressors التي حُذِفت.
   */
  forceReleaseBg(reason: string): number {
    if (reason === '*') {
      const n = this.bgSuppressors.size;
      if (n > 0) {
        amLog.warn(`forceReleaseBg('*') clearing ${n} suppressor(s):`,
          Array.from(this.bgSuppressors.keys()));
        this.bgSuppressors.clear();
        this.stopPurgeTimer();
        this.suppressionToken++;
        this.checkResumeBg();
      }
      return n;
    }
    const existed = this.bgSuppressors.delete(reason);
    if (existed) {
      if (this.bgSuppressors.size === 0) this.stopPurgeTimer();
      amLog.warn(`forceReleaseBg('${reason}')`);
      this.checkResumeBg();
      return 1;
    }
    return 0;
  }

  /**
   * Drops stale nav-scoped suppressors and attempts to resume background audio if appropriate.
   * Used to fix lingering suppressors after navigation.
   */
  recoverAudio(): void {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) return;
    const now = Date.now();
    if (now - this.lastRecoverAt < 400) return; // dedupe rapid double-calls
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

  // ─── P01.5: stale suppressor purge ──────────────────────────────────

  private startPurgeTimerIfNeeded(): void {
    if (this.purgeTimer !== null) return;
    if (typeof setInterval === 'undefined') return; // SSR / non-browser
    this.purgeTimer = setInterval(() => {
      this.purgeStaleSuppressors();
    }, AudioManager.SUPPRESSOR_PURGE_INTERVAL_MS);
  }

  private stopPurgeTimer(): void {
    if (this.purgeTimer !== null) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
  }

  /** يُحذف كل suppressor عمره ≥ SUPPRESSOR_STALE_MS. exposed لأغراض الاختبار. */
  purgeStaleSuppressors(): number {
    const now = performance.now();
    const threshold = AudioManager.SUPPRESSOR_STALE_MS;
    let removed = 0;
    this.bgSuppressors.forEach((meta, key) => {
      if (now - meta.ts >= threshold) {
        this.bgSuppressors.delete(key);
        removed++;
        amLog.warn(`Purged stale suppressor '${key}' (age=${Math.round(now - meta.ts)}ms)`);
      }
    });
    if (this.bgSuppressors.size === 0) {
      this.stopPurgeTimer();
      // P01.4: بطل أي fade-out معلَّق ثم حاول إعادة تشغيل bg
      this.suppressionToken++;
      this.checkResumeBg();
    }
    return removed;
  }

  // ─── P01.6: visibility & iOS user-gesture recovery ──────────────────

  private installVisibilityListenersIfBrowser(): void {
    if (this.visibilityListenersInstalled) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    this.visibilityListenersInstalled = true;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      this.handleVisibilityResume('visibilitychange');
    };

    const onPageShow = (e: PageTransitionEvent) => {
      // e.persisted = true يعني العودة من bfcache (Safari)
      this.handleVisibilityResume(e.persisted ? 'pageshow:bfcache' : 'pageshow');
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
  }

  /** يُستدعى عند visibility/pageshow. إن لزم gesture يسلّحه. */
  private handleVisibilityResume(source: string): void {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-page-active')) return;
    amLog.info(`visibility resume trigger: ${source}`);
    const bg = this.registry.get('bg');
    if (!bg) return;
    if (this.bgUserPaused) return;
    if (this.bgSuppressors.size > 0) return;
    if (this.active && this.active !== 'bg') return;

    // نحاول مباشرة. إن فشل لـ NotAllowedError، نسلّح gesture.
    bg.element.play().then(() => {
      this.setActive('bg');
      this.onStateChange?.(true);
      this.fadeIn(bg.element, bg.volume, 400);
    }).catch((err: unknown) => {
      amLog.warn(`visibility resume blocked, arming gesture (${(err as Error)?.name})`);
      this.armUserGestureResume();
    });
  }

  /**
   * يُسجَّل listener لـ pointerdown/keydown/touchend مرة واحدة، عند أول حدث:
   * - يحاول resumeBg() داخل sync handler (متوافق مع iOS gesture policy).
   * - ينظّف نفسه.
   * Public لأنّ طبقات أعلى قد تريد تسليحه يدوياً.
   */
  armUserGestureResume(): void {
    if (this.pendingGestureResume) return;
    if (typeof window === 'undefined') return;
    this.pendingGestureResume = true;

    const handler = () => {
      this.pendingGestureResume = false;
      // P01.4: ابطل أي suppression token معلَّق
      this.suppressionToken++;
      // sync attempt — مهم لـ iOS
      const bg = this.registry.get('bg');
      if (!bg) { cleanup(); return; }
      if (this.bgUserPaused || this.bgSuppressors.size > 0 || (this.active && this.active !== 'bg')) {
        cleanup();
        return;
      }
      const playPromise = bg.element.play();
      // داخل sync الـ handler — نُحدّث active مباشرة:
      this.setActive('bg');
      this.onStateChange?.(true);
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          this.fadeIn(bg.element, bg.volume, 400);
        }).catch(() => { /* لا شيء — قد يكون suppressed بين النقرة و التنفيذ */ });
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

  // ─── P01.8: play chain timeout wrapper ──────────────────────────────
  private withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const t = setTimeout(() => {
        if (settled) return;
        settled = true;
        amLog.warn(`playChain step '${label}' timeout after ${ms}ms`);
        reject(new Error(`AM_TIMEOUT:${label}`));
      }, ms);
      p.then(v => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve(v);
      }, err => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        reject(err);
      });
    });
  }
  // ────────────────────────────────────────────────────────────────────

  private fadeOut(el: HTMLAudioElement, ms: number): Promise<void> {
    this.clearFade(el);
    return new Promise(resolve => {
      if (ms <= 0) { el.volume = 0; return resolve(); }
      const startVol = el.volume;
      if (startVol <= 0) { el.volume = 0; return resolve(); }
      const startTime = performance.now();
      let cancelled = false;
      const tick = (now: number) => {
        if (cancelled || !this.fadeIntervals.has(el)) { resolve(); return; }
        const progress = Math.max(0, Math.min((now - startTime) / ms, 1));
        el.volume = Math.max(0, Math.min(startVol * (1 - progress), 1));
        if (progress < 1) {
          this.fadeIntervals.set(el, requestAnimationFrame(tick));
        } else {
          el.volume = 0;
          this.fadeIntervals.delete(el);
          resolve();
        }
      };
      this.fadeIntervals.set(el, requestAnimationFrame(tick));
    });
  }

  private fadeIn(el: HTMLAudioElement, target: number, ms: number): Promise<void> {
    this.clearFade(el);
    return new Promise(resolve => {
      const safeTarget = Math.max(0, Math.min(target, 1));
      if (ms <= 0) { el.volume = safeTarget; return resolve(); }
      if (el.volume >= safeTarget) return resolve();
      const startVol = el.volume;
      const startTime = performance.now();
      let cancelled = false;
      const tick = (now: number) => {
        if (cancelled || !this.fadeIntervals.has(el)) { resolve(); return; }
        const progress = Math.max(0, Math.min((now - startTime) / ms, 1));
        el.volume = Math.max(0, Math.min(startVol + (safeTarget - startVol) * progress, safeTarget));
        if (progress < 1) {
          this.fadeIntervals.set(el, requestAnimationFrame(tick));
        } else {
          el.volume = safeTarget;
          this.fadeIntervals.delete(el);
          resolve();
        }
      };
      this.fadeIntervals.set(el, requestAnimationFrame(tick));
    });
  }

  private clearFade(el: HTMLAudioElement) {
    const handle = this.fadeIntervals.get(el);
    if (handle !== undefined) {
      cancelAnimationFrame(handle);
      this.fadeIntervals.delete(el);
    }
  }
}

export const audioManager = new AudioManager();

// ─── P01.3: DEV-only window binding for diagnose() from DevTools ──────
if (__IS_DEV__ && typeof window !== 'undefined') {
  (window as any).audioManager = audioManager;
}
