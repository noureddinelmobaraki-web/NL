import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { audioManager } from './audioManager';

describe('audioManager', () => {
  let fakeAudio: HTMLAudioElement;

  beforeEach(() => {
    // Stub HTMLMediaElement play/pause which are often not implemented or stubbed in jsdom
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    fakeAudio = new Audio();
    // Use a readyState value that satisfies connection check (>= 2)
    Object.defineProperty(fakeAudio, 'readyState', {
      writable: true,
      configurable: true,
      value: 4, // HAVE_ENOUGH_DATA
    });
  });

  afterEach(() => {
    // Reset any state of the singleton audioManager between tests
    audioManager.stop('song');
    audioManager.stop('bg');
    audioManager.stop('lens');
    audioManager.stop('video');
    audioManager.stop('mebit');
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should register a new source successfully', () => {
      expect(() => {
        audioManager.register('song', fakeAudio, 0.7);
      }).not.toThrow();
    });

    it('should replace existing source for same key and pause the old one', () => {
      audioManager.register('song', fakeAudio, 0.7);
      
      const newAudio = new Audio();
      Object.defineProperty(newAudio, 'readyState', {
        writable: true,
        configurable: true,
        value: 4,
      });

      audioManager.register('song', newAudio, 0.5);
      expect(fakeAudio.pause).toHaveBeenCalled();
    });
  });

  describe('subscribeState', () => {
    it('should call callback when state changes', async () => {
      const cb = vi.fn();
      const unsubscribe = audioManager.subscribeState('song', cb);

      audioManager.register('song', fakeAudio, 0.7);
      await audioManager.play('song');

      expect(cb).toHaveBeenCalled();
      unsubscribe();
    });

    it('should not call after unsubscribe', async () => {
      const cb = vi.fn();
      const unsubscribe = audioManager.subscribeState('song', cb);
      unsubscribe();

      audioManager.register('song', fakeAudio, 0.7);
      await audioManager.play('song');

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('unpauseBg', () => {
    it('should exist as a function', () => {
      expect(typeof audioManager.unpauseBg).toBe('function');
    });

    it('should not throw when called without bg registered', () => {
      expect(() => audioManager.unpauseBg()).not.toThrow();
    });
  });

  describe('isSourceActive and getCurrentActive', () => {
    it('should return active status correctly', async () => {
      audioManager.register('song', fakeAudio, 0.7);
      expect(audioManager.isSourceActive('song')).toBe(false);
      expect(audioManager.getCurrentActive()).toBeNull();

      await audioManager.play('song');
      expect(audioManager.isSourceActive('song')).toBe(true);
      expect(audioManager.getCurrentActive()).toBe('song');
    });
  });

  describe('stop and pause', () => {
    it('should stop audio source and set state to inactive', async () => {
      audioManager.register('song', fakeAudio, 0.7);
      await audioManager.play('song');
      expect(audioManager.getCurrentActive()).toBe('song');

      audioManager.stop('song');
      expect(audioManager.getCurrentActive()).toBeNull();
      expect(fakeAudio.pause).toHaveBeenCalled();
    });

    it('should pause audio source and set state to inactive', async () => {
      audioManager.register('song', fakeAudio, 0.7);
      await audioManager.play('song');
      expect(audioManager.getCurrentActive()).toBe('song');

      audioManager.pause('song');
      expect(audioManager.getCurrentActive()).toBeNull();
      expect(fakeAudio.pause).toHaveBeenCalled();
    });
  });
});
