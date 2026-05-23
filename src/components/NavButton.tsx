import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  theme: string;
  fullWidthOnMobile?: boolean;
}

const THEME_STYLES: Record<string, string> = {
  dark: 'font-mono text-[0.7rem] sm:text-[0.65rem] tracking-wider sm:tracking-[0.2em] uppercase text-white border border-white/10 px-3 py-3 sm:px-4 sm:py-2 w-full sm:w-auto justify-center sm:justify-start hover:border-[#B8FF3F] hover:text-[#B8FF3F] transition-all duration-300 flex items-center gap-2',
  light: 'font-["Geneva",sans-serif] text-[0.7rem] text-black border border-[#999] px-3 py-3 sm:py-1 w-full sm:w-auto text-center justify-center sm:justify-start bg-[#F0EBE3] hover:bg-[#DDDDDD] active:bg-[#CCCCCC] flex items-center gap-2',
  bit: 'manga-paper-tab',
  midnight: 'manga-paper-tab',
};

const THEME_STYLES_INLINE: Record<string, React.CSSProperties> = {
  light: { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' },
};

export const NavButton = ({
  icon: Icon,
  label,
  onClick,
  theme,
  fullWidthOnMobile = false,
}: NavButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`${THEME_STYLES[theme] ?? THEME_STYLES.dark} ${fullWidthOnMobile ? 'col-span-2 sm:col-span-auto' : ''}`}
      style={THEME_STYLES_INLINE[theme]}
    >
      <Icon
        className="w-5 h-5"
        style={theme === 'dark' || theme === 'light' ? {} : { filter: 'url(#rough)' }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
};
