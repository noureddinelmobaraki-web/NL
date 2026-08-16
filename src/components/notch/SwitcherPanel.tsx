import { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Palette, Compass, ChevronDown } from 'lucide-react';
import type { SwitcherMode, SwitcherDest, SwitcherBranch } from './notch.types';
import type { Theme } from '../../utils/userPrefs';

const easeOut = [0.22, 0.61, 0.36, 1] as const;

interface Props {
  modes: SwitcherMode[];
  destinations: SwitcherDest[];
  theme: Theme;
  reduceMotion: boolean;
  isMobile: boolean;
  branch: SwitcherBranch | null;
  onBranch: (b: SwitcherBranch) => void;
  onMode: (id: Theme) => void;
}

function SwitcherPanelBase({ modes, destinations, theme, reduceMotion, isMobile, branch, onBranch, onMode }: Props) {
  const roots = [
    { id: 'modes' as const, label: 'Modes', icon: Palette },
    { id: 'dest' as const, label: 'Go to', icon: Compass },
  ];
  const dur = reduceMotion ? 0 : 0.16;
  // خصائص الحركة كثوابت (بدون double-brace داخل JSX).
  const gridInitial = reduceMotion ? false : { opacity: 0, height: 0 };
  const gridAnimate = reduceMotion ? {} : { opacity: 1, height: 'auto' };
  const gridExit = reduceMotion ? {} : { opacity: 0, height: 0 };
  const gridTransition = { duration: dur, ease: easeOut };

  return (
    <div className={`notch-tree ${isMobile ? 'is-mobile' : 'is-desktop'}`} dir="ltr" role="none">
      {roots.map((rt) => {
        const RootIcon = rt.icon;
        const isOpen = branch === rt.id;
        return (
          <div key={rt.id} className="notch-tree__branch" data-open={isOpen}>
            <button
              type="button"
              className={`notch-tree__root ${isOpen ? 'is-open' : ''}`}
              onClick={(e) => { e.stopPropagation(); onBranch(rt.id); }}
              aria-expanded={isOpen}
            >
              <span className="notch-tree__ico"><RootIcon size={16} /></span>
              <span className="notch-tree__label">{rt.label}</span>
              <ChevronDown className={`notch-tree__caret ${isOpen ? 'is-open' : ''}`} size={14} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  key={rt.id + '-grid'}
                  className="notch-tree__grid"
                  role="menu"
                  initial={gridInitial}
                  animate={gridAnimate}
                  exit={gridExit}
                  transition={gridTransition}
                >
                  <div className="notch-tree__grid-inner">
                    {rt.id === 'modes'
                      ? modes.map((m) => {
                          const MIcon = m.icon;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              role="menuitem"
                              className={`notch-tree__leaf ${theme === m.id ? 'is-active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); onMode(m.id); }}
                              aria-label={m.label}
                              title={m.label}
                            >
                              <span className="notch-tree__ico"><MIcon size={15} /></span>
                              <span className="notch-tree__label">{m.label}</span>
                            </button>
                          );
                        })
                      : destinations.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            role="menuitem"
                            className={`notch-tree__leaf ${d.isActive ? 'is-active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); d.onClick(); }}
                            aria-label={d.ariaLabel ?? d.label}
                            title={d.title ?? d.label}
                          >
                            <span className="notch-tree__ico">{d.icon}</span>
                            <span className="notch-tree__label">{d.label}</span>
                          </button>
                        ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export const SwitcherPanel = memo(SwitcherPanelBase);
export default SwitcherPanel;
