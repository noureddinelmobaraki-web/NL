/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */
import { createContext, useContext } from 'react';
import type { LauncherIntroDirector } from './useLauncherIntroDirector';

export const LauncherIntroContext = createContext<LauncherIntroDirector | null>(null);

/** Returns null when rendered outside the launcher (e.g. tests) — callers must handle it. */
export function useLauncherIntro(): LauncherIntroDirector | null {
  return useContext(LauncherIntroContext);
}
