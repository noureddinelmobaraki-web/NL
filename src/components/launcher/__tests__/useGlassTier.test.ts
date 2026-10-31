import { describe, expect, it } from 'vitest';
import { resolveGlassTier, supportsRefraction } from '../glass/useGlassTier';

describe('resolveGlassTier', () => {
  const baseDesktop = {
    motionProfile: 'full' as const,
    lowPerfClass: false,
    saveData: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    fineHover: true,
    wideViewport: true,
  };

  it('returns liquid on desktop with fine pointer, wide viewport, and full motion', () => {
    expect(resolveGlassTier(baseDesktop)).toBe('liquid');
  });

  it('returns frost on mobile/tablet or coarse pointer when hardware is healthy', () => {
    expect(resolveGlassTier({ ...baseDesktop, motionProfile: 'balanced', fineHover: false, wideViewport: false })).toBe('frost');
    expect(resolveGlassTier({ ...baseDesktop, fineHover: false })).toBe('frost');
    expect(resolveGlassTier({ ...baseDesktop, wideViewport: false })).toBe('frost');
  });

  it('returns lite when motionProfile is reduced, low-perf class is active, saveData is true, or device has <= 2GB RAM / <= 2 cores', () => {
    expect(resolveGlassTier({ ...baseDesktop, motionProfile: 'reduced' })).toBe('lite');
    expect(resolveGlassTier({ ...baseDesktop, lowPerfClass: true })).toBe('lite');
    expect(resolveGlassTier({ ...baseDesktop, saveData: true })).toBe('lite');
    expect(resolveGlassTier({ ...baseDesktop, deviceMemory: 2 })).toBe('lite');
    expect(resolveGlassTier({ ...baseDesktop, hardwareConcurrency: 2 })).toBe('lite');
  });

  it('detects Chromium SVG refraction support exclusively via userAgentData.brands', () => {
    expect(
      supportsRefraction({
        userAgentData: { brands: [{ brand: 'Chromium', version: '130' }, { brand: 'Google Chrome', version: '130' }] },
      } as unknown as Navigator),
    ).toBe(true);
    expect(
      supportsRefraction({
        userAgentData: { brands: [{ brand: 'AppleWebKit', version: '605' }] },
      } as unknown as Navigator),
    ).toBe(false);
    expect(supportsRefraction({} as unknown as Navigator)).toBe(false);
  });
});
