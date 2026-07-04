// src/components/layout/GlassBubbleGraph.tsx
// نظام تفرّع خفيف احترافي لنافذة تغيير الأوضاع (V2).
// جذران (Modes / Go to) بأسلوب أكورديون: فتح واحد يُغلق الآخر.
// الأبناء شبكة ملتفّة لا تتداخل. بلا SVG/مواضع مطلقة/ResizeObserver.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Compass, ChevronDown, type LucideIcon } from 'lucide-react';
import type { Theme } from '../../utils/userPrefs';

export interface BubbleMode { id: Theme; label: string; icon: LucideIcon; }
export interface BubbleDest {
  id: string;
  label: string;
  title?: string;
  ariaLabel?: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}

interface Props {
  modes: BubbleMode[];
  destinations: BubbleDest[];
  theme: Theme;
  onMode: (id: Theme) => void;
  getTabIndex: (id: string) => number;
  handleFocus: (id: string) => void;
  reduceMotion: boolean;
  isMobile: boolean;
}

type RootId = 'modes' | 'dest';

// حركات خفيفة (transform/opacity فقط) — بلا كائنات inline لتفادي أي التباس.
const easeOut = [0.22, 0.61, 0.36, 1] as const;
const gridInit = { opacity: 0, y: -4 };
const gridShow = { opacity: 1, y: 0 };
const gridHide = { opacity: 0, y: -4 };
const leafInit = { opacity: 0, scale: 0.92 };
const leafShow = { opacity: 1, scale: 1 };
const leafHide = { opacity: 0, scale: 0.92 };

export function GlassBubbleGraph({
  modes, destinations, theme, onMode, getTabIndex, handleFocus, reduceMotion, isMobile,
}: Props) {
  const [activeRoot, setActiveRoot] = useState<RootId>('modes');

  const roots: { id: RootId; label: string; icon: LucideIcon }[] = [
    { id: 'modes', label: 'Modes', icon: Palette },
    { id: 'dest', label: 'Go to', icon: Compass },
  ];

  const dur = reduceMotion ? 0 : 0.16;
  const gridT = { duration: dur, ease: easeOut };
  const leafT = (i: number) => ({ duration: dur, ease: easeOut, delay: reduceMotion ? 0 : i * 0.015 });

  return (
    <div className={`gs-tree2 ${isMobile ? 'is-mobile' : 'is-desktop'}`} dir="ltr" role="none">
      {roots.map((rt) => {
        const RootIcon = rt.icon;
        const isOpen = activeRoot === rt.id;
        return (
          <div key={rt.id} className="gs-tree2-branch" data-open={isOpen ? 'true' : 'false'}>
            <button
              type="button"
              className={`gs-tree2-root ${isOpen ? 'is-open' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveRoot(rt.id); }}
              aria-expanded={isOpen}
            >
              <span className="gs-tree2-ico"><RootIcon size={16} /></span>
              <span className="gs-tree2-label">{rt.label}</span>
              <ChevronDown className={`gs-tree2-caret ${isOpen ? 'is-open' : ''}`} size={14} aria-hidden="true" />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key={rt.id + '-grid'}
                  className="gs-tree2-grid"
                  role="menu"
                  initial={reduceMotion ? undefined : gridInit}
                  animate={gridShow}
                  exit={reduceMotion ? undefined : gridHide}
                  transition={gridT}
                >
                  {rt.id === 'modes'
                    ? modes.map((m, i) => {
                        const MIcon = m.icon;
                        const navId = 'mode-' + m.id;
                        return (
                          <motion.button
                            key={navId}
                            type="button"
                            role="menuitem"
                            className={`gs-tree2-leaf gs-tree2-leaf--mode ${theme === m.id ? 'is-active' : ''}`}
                            initial={reduceMotion ? undefined : leafInit}
                            animate={leafShow}
                            exit={reduceMotion ? undefined : leafHide}
                            transition={leafT(i)}
                            onClick={(e) => { e.stopPropagation(); onMode(m.id); }}
                            data-nav-id={navId}
                            tabIndex={getTabIndex(navId)}
                            onFocus={() => handleFocus(navId)}
                            aria-label={m.label}
                            title={m.label}
                          >
                            <span className="gs-tree2-ico"><MIcon size={15} /></span>
                            <span className="gs-tree2-label">{m.label}</span>
                          </motion.button>
                        );
                      })
                    : destinations.map((d, i) => {
                        const navId = 'dest-' + d.id;
                        return (
                          <motion.button
                            key={navId}
                            type="button"
                            role="menuitem"
                            className={`gs-tree2-leaf ${d.isActive ? 'is-active' : ''}`}
                            initial={reduceMotion ? undefined : leafInit}
                            animate={leafShow}
                            exit={reduceMotion ? undefined : leafHide}
                            transition={leafT(i)}
                            onClick={(e) => { e.stopPropagation(); d.onClick(e); }}
                            data-nav-id={navId}
                            tabIndex={getTabIndex(navId)}
                            onFocus={() => handleFocus(navId)}
                            aria-label={d.ariaLabel ?? d.label}
                            title={d.title ?? d.label}
                          >
                            <span className="gs-tree2-ico">{d.icon}</span>
                            <span className="gs-tree2-label">{d.label}</span>
                          </motion.button>
                        );
                      })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
