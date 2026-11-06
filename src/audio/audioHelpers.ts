export type AudioSource =
  | 'bg' | 'song' | 'lens' | 'video' | 'mebit' | 'intro'
  | 'games' | 'movies' | 'series' | 'tv' | 'retro' | 'xp'
  | 'profile'   // أغنية بروفيل المستخدم (ThemeSongBar)
  | 'portrait'  // خلفية صفحة البورتريه المستقلة (PortraitPage)
  | 'liquidGlass' // خلفية صفحة الزجاج السائل المستقلة (LiquidGlassPortalPage)
  | 'poem'      // قصيدة صفحة البورتريه (metxtbg)
  | 'preview'   // معاينة أغنية داخل النوافذ (useSongPreview)
  | 'preview_clip'; // معاينة مقطع لضبط أغنية الثيم (ThemeSongClipSelector)

export interface ExternalSource {
  pause: () => void;       // كيف يوقف هذا المصدر نفسه (مثلاً audioEngine.pause)
  isPlaying: () => boolean;
  resume?: () => void;     // اختياري: استئناف عند تحرّر الأولوية
}

/** Metadata لكل suppressor مسجَّل في bgSuppressors. */
export interface SuppressorMeta {
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

export interface AudioEntry {
  source: AudioSource;
  element: HTMLAudioElement;
  volume: number;
  pendingPlay: boolean;
  generation: number;
  _cleanup?: () => void;
}

export const __IS_DEV__ =
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
export const amLog = {
  // eslint-disable-next-line no-console
  info:  (...args: unknown[]): void => { if (__amLogEnabled()) console.log('[AM]', ...args); },
  warn:  (...args: unknown[]): void => { if (__amLogEnabled()) console.warn('[AM]', ...args); },
  error: (...args: unknown[]): void => { if (__amLogEnabled()) console.error('[AM]', ...args); },
  // eslint-disable-next-line no-console
  group: (label: string): void => { if (__amLogEnabled()) console.group(`[AM] ${label}`); },
  // eslint-disable-next-line no-console
  groupEnd: (): void => { if (__amLogEnabled()) console.groupEnd(); },
};

export const RICH_NP = new Set<string>(['song', 'profile']);

export const NP_LABELS: Record<string, string> = {
  lens: 'Lens Gallery', mebit: 'ME', games: 'Games', movies: 'Cinema',
  series: 'Series', tv: 'TV', retro: 'Retro', video: 'Video',
  intro: 'Intro', preview: 'Preview', preview_clip: 'Preview', xp: 'Windows XP',
  liquidGlass: 'Liquid Glass',
};

const SOURCE_PRIORITIES: Record<AudioSource, number> = {
  'preview': 11,
  'preview_clip': 11,
  'profile': 12,
  'song': 10,
  'intro': 4,
  'lens': 8,
  'mebit': 8,
  'games': 6,
  'movies': 6,
  'series': 6,
  'tv': 6,
  'retro': 6,
  'xp': 6,
  'portrait': 6,
  'liquidGlass': 6,
  'poem': 7,
  'video': 5,
  'bg': 1,
};

export function getAudioPriority(source: AudioSource): number {
  return SOURCE_PRIORITIES[source] || 0;
}

export function getFadeDurationForSource(source: AudioSource): number {
  if (source === 'bg' || source === 'intro') return 800;
  if (source === 'song') return 0;
  if (source === 'mebit' || source === 'lens') return 50;
  return 200;
}

/** Wraps a promise with a timeout so playChain steps never hang indefinitely. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
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

/** Attaches a 'canplay' listener with immediate readyState >= 2 check. */
export function waitForCanPlay(
  element: HTMLAudioElement,
  entry: AudioEntry,
  onReady: () => void
): () => void {
  element.addEventListener('canplay', onReady);
  const cleanup = () => element.removeEventListener('canplay', onReady);
  if (element.readyState >= 2 && entry.pendingPlay) {
    onReady();
  }
  return cleanup;
}

export function clearAudioFade(
  fadeIntervals: Map<HTMLAudioElement, number>,
  el: HTMLAudioElement
): void {
  const handle = fadeIntervals.get(el);
  if (handle !== undefined) {
    cancelAnimationFrame(handle);
    fadeIntervals.delete(el);
  }
}

export function fadeVolume(
  fadeIntervals: Map<HTMLAudioElement, number>,
  el: HTMLAudioElement,
  target: number,
  ms: number,
  direction: 'in' | 'out'
): Promise<void> {
  clearAudioFade(fadeIntervals, el);
  return new Promise(resolve => {
    if (direction === 'out') {
      if (ms <= 0) { el.volume = 0; return resolve(); }
      const startVol = el.volume;
      if (startVol <= 0) { el.volume = 0; return resolve(); }
      const startTime = performance.now();
      const tick = (now: number) => {
        if (!fadeIntervals.has(el)) { resolve(); return; }
        const progress = Math.max(0, Math.min((now - startTime) / ms, 1));
        el.volume = Math.max(0, Math.min(startVol * (1 - progress), 1));
        if (progress < 1) {
          fadeIntervals.set(el, requestAnimationFrame(tick));
        } else {
          el.volume = 0;
          fadeIntervals.delete(el);
          resolve();
        }
      };
      fadeIntervals.set(el, requestAnimationFrame(tick));
    } else {
      const safeTarget = Math.max(0, Math.min(target, 1));
      if (ms <= 0) { el.volume = safeTarget; return resolve(); }
      if (el.volume >= safeTarget) return resolve();
      const startVol = el.volume;
      const startTime = performance.now();
      const tick = (now: number) => {
        if (!fadeIntervals.has(el)) { resolve(); return; }
        const progress = Math.max(0, Math.min((now - startTime) / ms, 1));
        el.volume = Math.max(0, Math.min(startVol + (safeTarget - startVol) * progress, safeTarget));
        if (progress < 1) {
          fadeIntervals.set(el, requestAnimationFrame(tick));
        } else {
          el.volume = safeTarget;
          fadeIntervals.delete(el);
          resolve();
        }
      };
      fadeIntervals.set(el, requestAnimationFrame(tick));
    }
  });
}

export function buildDiagnosticsSnapshot(
  active: AudioSource | null,
  bgUserPaused: boolean,
  isManifestParsed: boolean,
  registry: Map<AudioSource, AudioEntry>,
  bgSuppressors: Map<string, SuppressorMeta>,
  stateSubscribers: Map<AudioSource, Set<() => void>>,
  fadeIntervalsCount: number,
  manifestParsedCallbacks: number
): AudioManagerDiagnostics {
  const now = performance.now();
  const subscriberCounts: Partial<Record<AudioSource, number>> = {};
  stateSubscribers.forEach((set, src) => {
    subscriberCounts[src] = set.size;
  });

  return {
    active,
    bgUserPaused,
    isManifestParsed,
    registry: Array.from(registry.values()).map(e => ({
      source: e.source,
      volume: e.volume,
      pendingPlay: e.pendingPlay,
      generation: e.generation,
      paused: e.element.paused,
      currentVolume: e.element.volume,
      readyState: e.element.readyState,
      src: e.element.currentSrc || e.element.src || '',
    })),
    suppressors: Array.from(bgSuppressors.values()).map(m => ({
      reason: m.reason,
      ageMs: Math.round(now - m.ts),
    })),
    subscriberCounts,
    fadeIntervalsCount,
    manifestParsedCallbacks,
  };
}
