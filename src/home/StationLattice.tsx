// src/home/StationLattice.tsx
import {
  memo,
  type CSSProperties,
  type ReactNode,
} from 'react';

export interface LatticeItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  color?: string;
  content: ReactNode;
}

interface StationLatticeProps {
  items: LatticeItem[];
  lite: boolean;
  cordId?: string;
}

function accentStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  const vars: Record<string, string> = { '--node-accent': color };
  return vars as CSSProperties;
}

export const StationLattice = memo(function StationLattice({
  items,
  cordId,
}: StationLatticeProps) {
  const isSocial = cordId === 'social-hub';
  const sectionLabel = isSocial ? 'SOCIAL CHANNELS' : 'STREAMING PLATFORMS';

  return (
    <div className="nl-lattice nl-platform-dock" data-cord-id={cordId}>
      <div className="nl-platform-dock__header">
        <span className="nl-platform-dock__eyebrow">{sectionLabel}</span>
        <span className="nl-platform-dock__line" aria-hidden="true" />
      </div>

      <div className="nl-lattice-row nl-platform-dock__grid">
        {items.map((it) => {
          const inner = (
            <>
              <span className="nl-lattice-glass">
                <span className="nl-lattice-node-glyph">{it.content}</span>
                <span className="nl-lattice-glass-gloss" aria-hidden="true" />
              </span>
              <span className="nl-lattice-node-label">{it.label}</span>
            </>
          );

          return (
            <div key={it.id} className="nl-lattice-node-unit" style={accentStyle(it.color)}>
              {it.href ? (
                <a
                  className="nl-lattice-node"
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={it.label}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  className="nl-lattice-node"
                  onClick={it.onClick}
                  aria-label={it.label}
                >
                  {inner}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

