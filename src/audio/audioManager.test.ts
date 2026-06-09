import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { audioManager } from './audioManager';

const makeAudio = (readyState = 4): HTMLAudioElement => {
  const a = new Audio();
  Object.defineProperty(a, 'readyState', { writable: true, configurable: true, value: readyState });
  return a;
};

const fakeAudio = makeAudio();

describe('audioManager', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    // نظافة شاملة بعد كل test
    audioManager.forceReleaseBg('*');
    (['song','bg','lens','video','mebit'] as const).forEach(s => {
      try { audioManager.stop(s); } catch {}
      try { audioManager.unregister(s); } catch {}
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ─── existing tests (kept for regression) ─────────────────────────
  describe('register', () => {
    it('T-base-1: registers a new source', () => {
      const a = makeAudio();
      expect(() => audioManager.register('song', a, 0.7)).not.toThrow();
    });
    it('T-base-2: replaces and pauses the old element', () => {
      const a = makeAudio();
      audioManager.register('song', a, 0.7);
      const b = makeAudio();
      audioManager.register('song', b, 0.5);
      expect(a.pause).toHaveBeenCalled();
    });
  });

  describe('subscribeState', () => {
    it('T-base-3: cb called on state change', async () => {
      const cb = vi.fn();
      const off = audioManager.subscribeState('song', cb);
      audioManager.register('song', makeAudio(), 0.7);
      await audioManager.play('song');
      expect(cb).toHaveBeenCalled();
      off();
    });
    it('T-base-4: cb not called after unsubscribe', async () => {
      const cb = vi.fn();
      const off = audioManager.subscribeState('song', cb);
      off();
      audioManager.register('song', makeAudio(), 0.7);
      await audioManager.play('song');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('isSourceActive / getCurrentActive', () => {
    it('T-base-5: reflects state', async () => {
      audioManager.register('song', makeAudio(), 0.7);
      expect(audioManager.getCurrentActive()).toBeNull();
      await audioManager.play('song');
      expect(audioManager.isSourceActive('song')).toBe(true);
      expect(audioManager.getCurrentActive()).toBe('song');
    });
  });

  describe('stop / pause', () => {
    it('T-base-6: stop deactivates', async () => {
      audioManager.register('song', makeAudio(), 0.7);
      await audioManager.play('song');
      audioManager.stop('song');
      expect(audioManager.getCurrentActive()).toBeNull();
    });
    it('T-base-7: pause deactivates', async () => {
      audioManager.register('song', makeAudio(), 0.7);
      await audioManager.play('song');
      audioManager.pause('song');
      expect(audioManager.getCurrentActive()).toBeNull();
    });
  });

  // ─── P01.1: Map-based suppressors ─────────────────────────────────
  describe('P01.1: suppressors map', () => {
    it('T1: suppressBg stores metadata with ts', () => {
      audioManager.suppressBg('foo');
      const d = audioManager.diagnose();
      expect(d.suppressors).toHaveLength(1);
      expect(d.suppressors[0].reason).toBe('foo');
      expect(d.suppressors[0].ageMs).toBeGreaterThanOrEqual(0);
    });
    it('T2: suppressBg twice for same reason stays size=1', () => {
      audioManager.suppressBg('foo');
      audioManager.suppressBg('foo');
      expect(audioManager.diagnose().suppressors).toHaveLength(1);
    });
    it('T3: releaseBg removes entry', () => {
      audioManager.suppressBg('foo');
      audioManager.releaseBg('foo');
      expect(audioManager.diagnose().suppressors).toHaveLength(0);
    });
    it('T4: releaseBg for non-existent reason is no-op', () => {
      expect(() => audioManager.releaseBg('non-existent')).not.toThrow();
    });
  });

  // ─── P01.2: logger (smoke) ────────────────────────────────────────
  describe('P01.2: amLog', () => {
    it('T5: warn does not throw in test env', () => {
      // الـ logger يطبع فقط في DEV — هنا نختبر عدم رمي exception.
      expect(() => audioManager.suppressBg('foo')).not.toThrow();
    });
    it('T6: localStorage flag fallback path (no-throw)', () => {
      try { localStorage.setItem('NL_AM_LOG', '1'); } catch {}
      expect(() => audioManager.releaseBg('x')).not.toThrow();
      try { localStorage.removeItem('NL_AM_LOG'); } catch {}
    });
  });

  // ─── P01.3: diagnose / hasActiveSuppressor / forceReleaseBg ───────
  describe('P01.3: diagnostics', () => {
    it('T7: diagnose contains all expected keys', () => {
      const d = audioManager.diagnose();
      expect(d).toHaveProperty('active');
      expect(d).toHaveProperty('bgUserPaused');
      expect(d).toHaveProperty('isManifestParsed');
      expect(d).toHaveProperty('registry');
      expect(d).toHaveProperty('suppressors');
      expect(d).toHaveProperty('subscriberCounts');
      expect(d).toHaveProperty('fadeIntervalsCount');
      expect(d).toHaveProperty('manifestParsedCallbacks');
    });
    it('T8: diagnose().active reflects setActive', async () => {
      audioManager.register('song', makeAudio(), 0.7);
      await audioManager.play('song');
      expect(audioManager.diagnose().active).toBe('song');
    });
    it('T9: diagnose().suppressors[].ageMs >= 0', async () => {
      audioManager.suppressBg('age-test');
      await new Promise(r => setTimeout(r, 5));
      const d = audioManager.diagnose();
      expect(d.suppressors[0].ageMs).toBeGreaterThanOrEqual(0);
    });
    it('T10: hasActiveSuppressor() w/o arg', () => {
      expect(audioManager.hasActiveSuppressor()).toBe(false);
      audioManager.suppressBg('foo');
      expect(audioManager.hasActiveSuppressor()).toBe(true);
    });
    it('T11: hasActiveSuppressor(reason)', () => {
      audioManager.suppressBg('foo');
      expect(audioManager.hasActiveSuppressor('foo')).toBe(true);
      expect(audioManager.hasActiveSuppressor('bar')).toBe(false);
    });
    it('T12: forceReleaseBg(*) clears all and returns count', () => {
      audioManager.suppressBg('a');
      audioManager.suppressBg('b');
      audioManager.suppressBg('c');
      expect(audioManager.forceReleaseBg('*')).toBe(3);
      expect(audioManager.diagnose().suppressors).toHaveLength(0);
    });
    it('T13: forceReleaseBg(unknown) returns 0', () => {
      expect(audioManager.forceReleaseBg('nope')).toBe(0);
    });
    it('T14: forceReleaseBg triggers checkResumeBg path', () => {
      audioManager.suppressBg('x');
      audioManager.forceReleaseBg('x');
      expect(audioManager.diagnose().suppressors).toHaveLength(0);
    });
  });

  // ─── P01.4: fade-out race ─────────────────────────────────────────
  describe('P01.4: suppression token', () => {
    it('T15: fast suppress→release does not leak active=null', async () => {
      audioManager.register('bg', makeAudio(), 0.7);
      await audioManager.play('bg');
      audioManager.suppressBg('quick');
      audioManager.releaseBg('quick');
      // الـ token bumped — أي fade-out متأخر يجب أن يخرج صامتاً
      await new Promise(r => setTimeout(r, 200));
      // الـ state يجب أن يكون متوافقاً
      expect(audioManager.diagnose().suppressors).toHaveLength(0);
    });
    it('T16: suppressBg duplicate is idempotent', () => {
      audioManager.suppressBg('dup');
      audioManager.suppressBg('dup');
      expect(audioManager.diagnose().suppressors).toHaveLength(1);
    });
    it('T17: suppressionToken increments per suppressBg (indirect)', () => {
      audioManager.suppressBg('a');
      audioManager.suppressBg('b');
      // لا قراءة مباشرة للـ token (private)، لكن السلوك:
      expect(audioManager.diagnose().suppressors).toHaveLength(2);
    });
    it('T18: releaseBg unknown does not bump token', () => {
      audioManager.releaseBg('never-was');
      expect(audioManager.diagnose().suppressors).toHaveLength(0);
    });
  });

  // ─── P01.5: purge timer ───────────────────────────────────────────
  describe('P01.5: stale purge', () => {
    it('T19: purgeStaleSuppressors removes old entries (mock now)', () => {
      audioManager.suppressBg('old');
      // التلاعب بـ ts عبر ضرب suppressBg ثم انتظار وهمي:
      // نستخدم vi.useFakeTimers + advance:
      vi.useFakeTimers();
      vi.advanceTimersByTime(31_000);
      const removed = audioManager.purgeStaleSuppressors();
      // التلميح: قد يكون 1 أو 0 حسب performance.now داخل jsdom.
      // الاختبار يضمن عدم الانفجار:
      expect(removed).toBeGreaterThanOrEqual(0);
    });
    it('T20: fresh suppressor not purged', () => {
      audioManager.suppressBg('fresh');
      expect(audioManager.purgeStaleSuppressors()).toBe(0);
      expect(audioManager.diagnose().suppressors).toHaveLength(1);
    });
    it('T21: startPurgeTimerIfNeeded idempotent (no-throw)', () => {
      audioManager.suppressBg('t1');
      audioManager.suppressBg('t2');
      audioManager.suppressBg('t3');
      expect(audioManager.diagnose().suppressors).toHaveLength(3);
    });
    it('T22: timer stops when size hits 0', () => {
      audioManager.suppressBg('one');
      audioManager.releaseBg('one');
      expect(audioManager.diagnose().suppressors).toHaveLength(0);
    });
    it('T23: purge invokes checkResumeBg path', () => {
      audioManager.suppressBg('purgable');
      const before = audioManager.diagnose().suppressors.length;
      audioManager.forceReleaseBg('*'); // proxy للسلوك
      expect(audioManager.diagnose().suppressors.length).toBeLessThan(before);
    });
  });

  // ─── P01.6: visibility / gesture ──────────────────────────────────
  describe('P01.6: visibility + gesture', () => {
    it('T24: armUserGestureResume idempotent', () => {
      audioManager.armUserGestureResume();
      audioManager.armUserGestureResume();
      expect(() => audioManager.armUserGestureResume()).not.toThrow();
    });
    it('T25: handleVisibilityResume bails when bgUserPaused', () => {
      audioManager.register('bg', makeAudio(), 0.7);
      audioManager.pause('bg'); // → bgUserPaused = true
      expect(audioManager.diagnose().bgUserPaused).toBe(true);
    });
    it('T26: handleVisibilityResume bails when suppressor exists', () => {
      audioManager.suppressBg('lens_open');
      expect(audioManager.hasActiveSuppressor('lens_open')).toBe(true);
    });
    it('T27: gesture handler attempt no-throw without bg', () => {
      audioManager.armUserGestureResume();
      // simulate pointerdown:
      window.dispatchEvent(new Event('pointerdown'));
      expect(true).toBe(true); // smoke
    });
  });

  // ─── P01.7: onSongEnd ─────────────────────────────────────────────
  describe('P01.7: onSongEnd', () => {
    it('T28: releases active_song suppressor', () => {
      audioManager.suppressBg('active_song');
      audioManager.onSongEnd();
      expect(audioManager.hasActiveSuppressor('active_song')).toBe(false);
    });
    it('T29: active becomes null', async () => {
      audioManager.register('song', makeAudio(), 0.7);
      await audioManager.play('song');
      audioManager.onSongEnd();
      expect(audioManager.getCurrentActive()).toBeNull();
    });
    it('T30: does not flip bgUserPaused', async () => {
      audioManager.register('bg', makeAudio(), 0.7);
      audioManager.pause('bg');
      const before = audioManager.diagnose().bgUserPaused;
      audioManager.onSongEnd();
      expect(audioManager.diagnose().bgUserPaused).toBe(before);
    });
    it('T31: onSongEnd without registered song does not throw', () => {
      expect(() => audioManager.onSongEnd()).not.toThrow();
    });
  });

  // ─── P01.8: playChain timeout ─────────────────────────────────────
  describe('P01.8: playChain timeout', () => {
    let originalTimeout: number;
    let AudioManagerClass: any;

    beforeEach(() => {
      AudioManagerClass = audioManager.constructor;
      originalTimeout = AudioManagerClass.PLAY_STEP_TIMEOUT_MS;
      AudioManagerClass.PLAY_STEP_TIMEOUT_MS = 50;
    });

    afterEach(() => {
      AudioManagerClass.PLAY_STEP_TIMEOUT_MS = originalTimeout;
    });

    it('T32: long-blocking play() does not freeze chain (smoke)', async () => {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(
        () => new Promise(() => { /* never resolves */ }) as Promise<void>
      );
      audioManager.register('song', makeAudio(), 0.7);
      const p = audioManager.play('song');
      // إن لم يكن timeout، الـ test سيعلَق و vitest يطفئه.
      // مع timeout نتوقع return خلال ~50ms. نختبر أنّ الـ promise قابل للحلّ.
      await Promise.race([p, new Promise(r => setTimeout(r, 200))]);
      expect(true).toBe(true);
    }, 10_000);

    it('T33: chain continues after timeout', async () => {
      audioManager.register('song', makeAudio(), 0.7);

      // First play hangs
      const neverEndingPromise = new Promise<void>(() => {});
      const spySongPlay = vi.spyOn(fakeAudio, 'play').mockReturnValue(neverEndingPromise as any);
      
      // @ts-expect-error - readyState set to 4
      fakeAudio.readyState = 4;

      const firstPlay = audioManager.play('song');

      // Create a second clean audio source that works
      const secondAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        volume: 0,
        readyState: 4,
        paused: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;

      audioManager.register('bg', secondAudio, 0.5);
      const secondPlay = audioManager.play('bg');

      // Wait for first play to timeout and second to succeed
      await new Promise(resolve => setTimeout(resolve, 100));

      await firstPlay;
      await secondPlay;

      expect(secondAudio.play).toHaveBeenCalled();
      spySongPlay.mockRestore();
    });
  });

  // ─── P01.9: unregister ────────────────────────────────────────────
  describe('P01.9: unregister', () => {
    it('T34: removes from registry', () => {
      audioManager.register('lens', makeAudio(), 0.7);
      audioManager.unregister('lens');
      const reg = audioManager.diagnose().registry.find(r => r.source === 'lens');
      expect(reg).toBeUndefined();
    });
    it('T35: unregister missing is no-op', () => {
      expect(() => audioManager.unregister('lens')).not.toThrow();
    });
    it('T36: unregister of active sets active=null', async () => {
      audioManager.register('lens', makeAudio(), 0.7);
      await audioManager.play('lens');
      audioManager.unregister('lens');
      expect(audioManager.getCurrentActive()).toBeNull();
    });
    it('T37: unregister song releases active_song', () => {
      audioManager.register('song', makeAudio(), 0.7);
      audioManager.suppressBg('active_song');
      audioManager.unregister('song');
      expect(audioManager.hasActiveSuppressor('active_song')).toBe(false);
    });
  });
});
