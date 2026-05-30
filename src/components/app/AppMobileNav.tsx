import { MobileNavBar } from '../MobileNavBar';

interface AppMobileNavProps {
  isMobile: boolean;
  isTablet: boolean;
  currentPage: string;
  isBgPlaying: boolean;
  onNavigate: (page: string) => void;
  onToggleBg: () => void;
}

export function AppMobileNav({
  isMobile,
  isTablet,
  currentPage,
  isBgPlaying,
  onNavigate,
  onToggleBg,
}: AppMobileNavProps) {
  if (!(isMobile || isTablet)) return null;

  return (
    <MobileNavBar 
      currentPage={currentPage} 
      onNavigate={onNavigate} 
      isBgPlaying={isBgPlaying}
      onToggleBg={onToggleBg}
    />
  );
}
