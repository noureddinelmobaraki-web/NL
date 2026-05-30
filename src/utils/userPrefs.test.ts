import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrefs, savePrefs } from './userPrefs';

describe('userPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadPrefs() with no localStorage returns default prefs (theme: midnight)', () => {
    const prefs = loadPrefs();
    expect(prefs.theme).toBe('midnight');
  });

  it('savePrefs({ theme: "dark" }) then loadPrefs() returns { theme: "dark" }', () => {
    savePrefs({ theme: 'dark' });
    const prefs = loadPrefs();
    expect(prefs.theme).toBe('dark');
  });
});
