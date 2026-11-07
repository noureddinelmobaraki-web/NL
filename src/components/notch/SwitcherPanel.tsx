import { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Palette, Compass, ChevronDown } from 'lucide-react';
import type { SwitcherMode, SwitcherDest, SwitcherBranch } from './notch.types';
import type { Theme } from '../../utils/userPrefs';

const springExpand = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 30,
  mass: 0.75,
};

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
  if (isMobile) {
    return (
      <div className="notch-cc" dir="ltr" role="none">
        {/* Module 1: Visual Modes (2x2 iOS Control Center Plinths) */}
        <section className="notch-cc__module" aria-label="Visual Modes">
          <header className="notch-cc__module-head">
            <span className="notch-cc__module-ico">
              <Palette size={13} />
            </span>
            <span className="notch-cc__module-title">Visual Modes</span>
            <span className="notch-cc__module-badge">
              {theme === 'midnight' ? 'Default' : theme.toUpperCase()}
            </span>
          </header>
          <div className="notch-cc__modes-grid" role="group" aria-label="Modes">
            {modes.map((mItem) => {
              const MIcon = mItem.icon;
              const isActive = theme === mItem.id;
              return (
                <button
                  key={mItem.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isActive}
                  className={`notch-cc__mode-tile ${isActive ? 'is-active' : ''}`}
                  data-mode-id={mItem.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMode(mItem.id);
                  }}
                  aria-label={
                    isActive
                      ? `${mItem.label} (Active — tap to return to default)`
                      : mItem.label
                  }
                >
                  <span className="notch-tile__lum" aria-hidden="true" />
                  <span className="notch-cc__mode-top">
                    <span className="notch-cc__mode-orb">
                      <MIcon size={16} strokeWidth={2.2} />
                    </span>
                  </span>
                  <span className="notch-cc__mode-meta">
                    <span className="notch-cc__mode-name">{mItem.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Module 2: Destinations / Go To (4x3 iOS Control Center App Plinths) */}
        <section className="notch-cc__module" aria-label="Destinations">
          <header className="notch-cc__module-head">
            <span className="notch-cc__module-ico">
              <Compass size={13} />
            </span>
            <span className="notch-cc__module-title">Go To</span>
            <span className="notch-cc__module-badge">
              {destinations.length} Apps
            </span>
          </header>
          <div className="notch-cc__dest-grid" role="group" aria-label="Destinations">
            {destinations.map((d) => (
              <button
                key={d.id}
                type="button"
                role="menuitem"
                className={`notch-cc__dest-tile ${d.isActive ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  d.onClick();
                }}
                aria-label={d.ariaLabel ?? d.label}
                title={d.title ?? d.label}
              >
                <span className="notch-tile__lum" aria-hidden="true" />
                <span className="notch-cc__dest-orb">{d.icon}</span>
                <span className="notch-cc__dest-label">{d.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const roots = [
    { id: 'modes' as const, label: 'Modes', icon: Palette },
    { id: 'dest' as const, label: 'Go to', icon: Compass },
  ];
  const gridInitial = reduceMotion ? false : { opacity: 0, height: 0, scale: 0.96 };
  const gridAnimate = reduceMotion ? {} : { opacity: 1, height: 'auto', scale: 1 };
  const gridExit = reduceMotion ? {} : { opacity: 0, height: 0, scale: 0.96 };
  const gridTransition = reduceMotion ? { duration: 0 } : springExpand;

  return (
    <div className={`notch-tree ${isMobile ? 'is-mobile' : 'is-desktop'}`} dir="ltr" role="none">
      {roots.map((rt) => {
        const RootIcon = rt.icon;
        const isOpen = branch === rt.id;
        return (
          <div key={rt.id} className="notch-tree__branch" data-branch={rt.id} data-open={isOpen}>
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
                  <div className="notch-tree__grid-inner" data-branch={rt.id}>
                    {rt.id === 'modes'
                      ? modes.map((mItem) => {
                          const MIcon = mItem.icon;
                          const isActive = theme === mItem.id;
                          return (
                            <button
                              key={mItem.id}
                              type="button"
                              role="menuitemcheckbox"
                              aria-checked={isActive}
                              className={`notch-tree__leaf notch-tree__leaf--mode ${isActive ? 'is-active' : ''}`}
                              data-mode-id={mItem.id}
                              onClick={(e) => { e.stopPropagation(); onMode(mItem.id); }}
                              aria-label={isActive ? `${mItem.label} (Active — click to turn off & return to Home)` : mItem.label}
                              title={isActive ? `${mItem.label} — Turn off to return to Home` : mItem.label}
                            >
                              <span className="notch-tile__lum" aria-hidden="true" />
                              <span className="notch-tree__ico"><MIcon size={15} /></span>
                              <span className="notch-tree__label">{mItem.label}</span>
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
                            <span className="notch-tile__lum" aria-hidden="true" />
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

