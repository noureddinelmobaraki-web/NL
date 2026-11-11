/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Game Bundle Resolver Hook
 * Dynamically resolves the actual playable URL (.swf, .gb, .gba, .nes, .jsdos, or iframe)
 * when a game is selected from the sidebar.
 */

import { useState, useEffect } from 'react';
import type {
  ResolvedGameBundle,
  UnifiedGameItem,
} from '../types/games.types';
import { resolveArchiveOrgBundleUrl } from '../services/archiveOrgGamesClient';

export function useGameBundleResolver(selectedGame: UnifiedGameItem | null) {
  const [bundle, setBundle] = useState<ResolvedGameBundle | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGame) {
      setBundle(null);
      setResolving(false);
      setResolveError(null);
      return;
    }

    // Instant Mini-API games don't require external file resolution
    if (selectedGame.engine === 'mini-api') {
      setBundle({
        playableUrl: `mini://${selectedGame.miniGameKind || 'lichess-daily'}`,
        engine: 'mini-api',
        miniGameKind: selectedGame.miniGameKind,
        controlProfile: selectedGame.controlProfile,
      });
      setResolving(false);
      setResolveError(null);
      return;
    }

    // Direct bundle URL already available (Local 45 Flash games, Homebrew Hub, DOS.Zone)
    if (selectedGame.bundleUrl) {
      setBundle({
        playableUrl: selectedGame.bundleUrl,
        engine: selectedGame.engine,
        consoleCore: selectedGame.consoleCore,
        controlProfile: selectedGame.controlProfile,
      });
      setResolving(false);
      setResolveError(null);
      return;
    }

    // Dynamic Archive.org Metadata lookup
    if (selectedGame.archiveIdentifier) {
      const controller = new AbortController();
      setResolving(true);
      setResolveError(null);

      resolveArchiveOrgBundleUrl(
        selectedGame.archiveIdentifier,
        selectedGame.engine,
        controller.signal,
      )
        .then((res) => {
          if (controller.signal.aborted) return;
          if (res.playableUrl) {
            setBundle({
              playableUrl: res.playableUrl,
              engine: selectedGame.engine,
              consoleCore: res.consoleCore || selectedGame.consoleCore,
              controlProfile: selectedGame.controlProfile,
            });
          } else {
            setResolveError('تعذر استخراج ملف التشغيل المباشر من الأرشيف');
          }
          setResolving(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResolveError('حدث خطأ أثناء الاتصال بخادم الأرشيف');
            setResolving(false);
          }
        });

      return () => controller.abort();
    }
    return undefined;
  }, [selectedGame]);

  return {
    bundle,
    resolving,
    resolveError,
  };
}
