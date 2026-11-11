/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Hook for Avatar & Identity Lab (DiceBear v9 + RoboHash + Waifu.pics)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { AvatarConfigState } from '../types/art.types';
import {
  buildAvatarImageUrl,
  fetchRandomWaifuPortrait,
} from '../services/avatarGeneratorService';

const RANDOM_SEEDS = [
  'Nordine-NL',
  'Cyber-Samurai',
  'Spacetoon-Hero',
  'Pixel-Wizard',
  'Casablanca-Vibes',
  'Neo-Tokyo-99',
  'Atlas-Star',
  'MeBit-Legend',
];

export function useAvatarCustomizer() {
  const [config, setConfig] = useState<AvatarConfigState>({
    engine: 'dicebear',
    seed: 'Nordine-NL',
    dicebearStyle: 'pixel-art',
    backgroundColor: '#0f172a',
    radius: 20,
    robohashSet: 'set1',
    waifuCategory: 'waifu',
  });

  const [waifuUrl, setWaifuUrl] = useState<string>('');
  const [loadingWaifu, setLoadingWaifu] = useState(false);

  const refreshWaifu = useCallback(
    async (category = config.waifuCategory) => {
      setLoadingWaifu(true);
      const url = await fetchRandomWaifuPortrait(category);
      if (url) setWaifuUrl(url);
      setLoadingWaifu(false);
    },
    [config.waifuCategory],
  );

  useEffect(() => {
    if (config.engine === 'waifu' && !waifuUrl) {
      void refreshWaifu(config.waifuCategory);
    }
  }, [config.engine, config.waifuCategory, waifuUrl, refreshWaifu]);

  const avatarUrl = useMemo(() => {
    if (config.engine === 'waifu') {
      return (
        waifuUrl ||
        buildAvatarImageUrl({ ...config, engine: 'dicebear' })
      );
    }
    return buildAvatarImageUrl(config);
  }, [config, waifuUrl]);

  const randomizeSeed = useCallback(() => {
    const randomPick =
      RANDOM_SEEDS[Math.floor(Math.random() * RANDOM_SEEDS.length)] +
      '-' +
      Math.floor(100 + Math.random() * 900);
    setConfig((prev) => ({ ...prev, seed: randomPick }));
    if (config.engine === 'waifu') {
      void refreshWaifu(config.waifuCategory);
    }
  }, [config.engine, config.waifuCategory, refreshWaifu]);

  return {
    config,
    setConfig,
    avatarUrl,
    loadingWaifu,
    refreshWaifu,
    randomizeSeed,
  };
}
