/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { audioEngine } from '../../engine/audioEngine';
import { EQ_PRESETS } from '../../engine/eqPresets';
import type { MusicState } from '../musicStore';

export const DEFAULT_EQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function requireEqPresetGains(name: string): number[] | null {
  return EQ_PRESETS[name] || null;
}

export function createEqActions(
  set: (partial: Partial<MusicState> | ((state: MusicState) => Partial<MusicState>)) => void,
  get: () => MusicState,
) {
  return {
    setEqGain: (index: number, db: number) => {
      const gains = [...get().eqGains];
      gains[index] = db;
      set({ eqGains: gains, eqPreset: 'Custom' });
      audioEngine.setEqGain(index, db);
    },

    setEqPreset: (name: string) => {
      set({ eqPreset: name });
      audioEngine.setEqPreset(name);
      const presetGains = requireEqPresetGains(name);
      if (presetGains) {
        set({ eqGains: presetGains });
      }
    },

    setEqBypass: (b: boolean) => {
      set({ eqBypass: b });
      audioEngine.setEqBypass(b);
    },
  };
}
