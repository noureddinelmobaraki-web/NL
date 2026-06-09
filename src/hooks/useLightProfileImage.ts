/**
 * useLightProfileImage.ts
 *
 * Encapsulates the "opening → main" light-theme profile image swap
 * that previously lived inline in HeroSection.
 *
 * Behaviour preserved from the original:
 *   - On every transition into a `light*` theme, start with LIGHT_PROFILE_OPENING.
 *   - After 1500 ms, swap to LIGHT_PROFILE_MAIN.
 *   - Timer is cleared on unmount / theme change.
 *
 * Returns the active light-profile src as a string. The caller decides
 * whether to actually use it (i.e. only when the resolved theme is light).
 */

import { useEffect, useRef, useState } from 'react';
import { LIGHT_PROFILE_OPENING, LIGHT_PROFILE_MAIN } from '../constants/assets';

const OPENING_TO_MAIN_DELAY_MS = 1500;

export function useLightProfileImage(resolvedTheme: string): string {
  const [src, setSrc] = useState<string>(LIGHT_PROFILE_OPENING);
  const initialized = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (resolvedTheme.startsWith('light')) {
      setSrc(LIGHT_PROFILE_OPENING);
      initialized.current = false;
      timer = setTimeout(() => {
        setSrc(LIGHT_PROFILE_MAIN);
        initialized.current = true;
      }, OPENING_TO_MAIN_DELAY_MS);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resolvedTheme]);

  return src;
}
