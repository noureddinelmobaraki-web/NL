/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, type ComponentType, type CSSProperties } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { LogOut, Volume2, VolumeX, UserRound, X } from 'lucide-react';
import { audioManager } from '../../audio/audioManager';
import type { Theme } from '../../utils/userPrefs';
import { MODES, type PageKey } from './notch.constants';
import { NotchLivePill } from './NotchLivePill';
import { SwitcherPanel } from './SwitcherPanel';
import type { NotchTransport, SwitcherDest, SwitcherBranch } from './notch.types';

function useBackgroundFreeze(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    root.dataset.islandOpen = 'true';

    // Pause playing background <video> elements and resume them on cleanup
    const bgVideos = Array.from(
      document.querySelectorAll<HTMLVideoElement>(
        '.nl-launcher-video, .nl-launcher-bg-media, .lg-orbs-video',
      ),
    );
    const pausedVideos: HTMLVideoElement[] = [];
    for (const v of bgVideos) {
      if (!v.paused) {
        try {
          v.pause();
          pausedVideos.push(v);
        } catch {
          /* ignore */
        }
      }
    }

    // Set inert = true on sibling body children outside .notch-portal-root
    const inertAdjusted: Array<{ el: HTMLElement; prevInert: boolean }> = [];
    const bodyChildren = Array.from(document.body.children);
    for (const child of bodyChildren) {
      if (
        child instanceof HTMLElement &&
        !child.classList.contains('notch-portal-root')
      ) {
        inertAdjusted.push({ el: child, prevInert: Boolean(child.inert) });
        child.inert = true;
      }
    }

    return () => {
      delete root.dataset.islandOpen;
      for (const v of pausedVideos) {
        void v.play().catch(() => {});
      }
      for (const { el, prevInert } of inertAdjusted) {
        el.inert = prevInert;
      }
    };
  }, [active]);
}

interface DesktopNotchPanelProps {
  visible: boolean;
  destinations: SwitcherDest[];
  theme: Theme;
  reduceMotion: boolean;
  branch: SwitcherBranch | null;
  onBranch: (b: SwitcherBranch) => void;
  onMode: (id: Theme) => void;
  transport: NotchTransport | null;
  vibrate: () => void;
  muted: boolean;
  onProfileClick: () => void;
  onExit: () => void;
}

export function DesktopNotchPanel({
  visible,
  destinations,
  theme,
  reduceMotion,
  branch,
  onBranch,
  onMode,
  transport,
  vibrate,
  muted,
  onProfileClick,
  onExit,
}: DesktopNotchPanelProps) {
  const panelInitial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.88, y: -6 };
  const panelAnimate = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, y: 0 };
  const panelExit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.9, y: -4 };
  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 440, damping: 28, mass: 0.72 };

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="panel"
          className="notch-panel"
          role="menu"
          initial={panelInitial}
          animate={panelAnimate}
          exit={panelExit}
          transition={panelTransition}
        >
          <SwitcherPanel
            modes={MODES}
            destinations={destinations}
            theme={theme}
            reduceMotion={reduceMotion}
            isMobile={false}
            branch={branch}
            onBranch={onBranch}
            onMode={onMode}
          />
          <div className="notch-panel__footer" dir="ltr">
            {transport && (
              <div className="notch-panel__mini">
                <NotchLivePill t={transport} onVibrate={vibrate} compact />
              </div>
            )}
            <div className="notch-panel__tools">
              <button
                type="button"
                className="notch-tool"
                aria-pressed={muted}
                title={muted ? 'Unmute' : 'Mute'}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={(e) => {
                  e.stopPropagation();
                  audioManager.toggleMuted();
                  vibrate();
                }}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                type="button"
                className="notch-tool"
                title="Profile"
                aria-label="Profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onProfileClick();
                }}
              >
                <UserRound size={16} />
              </button>
              <button
                type="button"
                className="notch-tool notch-tool--exit"
                title="Exit"
                aria-label="Exit"
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

interface MobileControlCenterOverlayProps {
  visible: boolean;
  theme: Theme;
  lightPanel: boolean;
  accent: string;
  reduceMotion: boolean;
  pageKey: PageKey;
  OrbIcon: ComponentType<{ size?: number; strokeWidth?: number }>;
  transport: NotchTransport | null;
  destinations: SwitcherDest[];
  branch: SwitcherBranch | null;
  onBranch: (b: SwitcherBranch) => void;
  onMode: (id: Theme) => void;
  muted: boolean;
  close: () => void;
  schedule: () => void;
  vibrate: () => void;
  onProfileClick: () => void;
  onExit: () => void;
}

export function MobileControlCenterOverlay({
  visible,
  theme,
  lightPanel,
  accent,
  reduceMotion,
  pageKey,
  OrbIcon,
  transport,
  destinations,
  branch,
  onBranch,
  onMode,
  muted,
  close,
  schedule,
  vibrate,
  onProfileClick,
  onExit,
}: MobileControlCenterOverlayProps) {
  useBackgroundFreeze(visible);

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 440, damping: 28, mass: 0.72 };

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="mobile-control-center"
          className="notch-mobile-cc-overlay"
          data-theme-skin={theme}
          data-light={lightPanel ? 'true' : 'false'}
          style={{ ['--notch-accent' as string]: accent } as CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <div
            className="notch-mobile-cc-backdrop"
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              close();
              vibrate();
            }}
          />

          <m.div
            className="notch-mobile-cc-card"
            role="dialog"
            aria-modal="true"
            aria-label="Control Center"
            dir="ltr"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: 8 }
            }
            transition={panelTransition}
            onClick={(e) => {
              e.stopPropagation();
              schedule();
            }}
          >
            <span className="notch-island__gloss" aria-hidden="true" />

            <div className="notch-cc__header">
              <div className="notch-cc__brand">
                <span className="notch-cc__brand-orb">
                  <OrbIcon size={15} strokeWidth={2.3} />
                </span>
                <div className="notch-cc__brand-text">
                  <span className="notch-cc__brand-title">Control Center</span>
                  <span className="notch-cc__brand-sub">
                    {pageKey.toUpperCase()} • {theme === 'midnight' ? 'DEFAULT' : theme.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="notch-cc__close"
                aria-label="Close Control Center"
                title="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  vibrate();
                }}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            {transport && (
              <div className="notch-cc__now-playing">
                <NotchLivePill t={transport} onVibrate={vibrate} compact />
              </div>
            )}

            <SwitcherPanel
              modes={MODES}
              destinations={destinations}
              theme={theme}
              reduceMotion={reduceMotion}
              isMobile={true}
              branch={branch}
              onBranch={onBranch}
              onMode={onMode}
            />

            <div className="notch-cc__dock">
              <button
                type="button"
                className="notch-cc__dock-btn"
                aria-pressed={muted}
                title={muted ? 'Unmute' : 'Mute'}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={(e) => {
                  e.stopPropagation();
                  audioManager.toggleMuted();
                  schedule();
                  vibrate();
                }}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{muted ? 'Muted' : 'Sound'}</span>
              </button>
              <button
                type="button"
                className="notch-cc__dock-btn"
                title="Profile"
                aria-label="Profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onProfileClick();
                }}
              >
                <UserRound size={16} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                className="notch-cc__dock-btn notch-cc__dock-btn--exit"
                title="Exit"
                aria-label="Exit"
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
              >
                <LogOut size={16} />
                <span>Exit</span>
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
