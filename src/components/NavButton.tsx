import { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  theme: string;
  fullWidthOnMobile?: boolean;
  onMouseEnter?: () => void;
  onPointerDown?: () => void;
  index?: number;
}

export const NavButton = ({
  icon: Icon,
  label,
  onClick,
  theme,
  onMouseEnter,
  onPointerDown,
  index = 0,
}: NavButtonProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={(e) => {
        setExpanded(true);
        onClick(e);
      }}
      onMouseEnter={() => {
        setExpanded(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setExpanded(false);
      }}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      onPointerDown={() => {
        setExpanded(true);
        onPointerDown?.();
      }}
      className={`nl-top-nav__button nl-liquid-interactive${expanded ? ' is-expanded' : ''}`}
      type="button"
      data-theme-variant={theme}
      data-expanded={expanded ? 'true' : 'false'}
      aria-label={label}
      style={{ ['--worm-idx' as string]: index }}
    >
      <span className="nl-top-nav__bridge" aria-hidden="true" />
      <span className="nl-top-nav__chamber" aria-hidden="true" />
      <span className="nl-top-nav__icon-wrap">
        <Icon className="nl-top-nav__icon" aria-hidden="true" />
      </span>
      <span className="nl-top-nav__label">{label}</span>
    </button>
  );
};

