import { useViewportMode } from './useViewportMode';

export interface ResponsiveMedia {
  desktop: string;
  mobile: string;
  poster?: string;
}

/**
 * Picks the right media URL based on viewport.
 * Use for any video/image that has mobile-vs-desktop variants.
 */
export const useMediaSources = (sources: ResponsiveMedia): string => {
  const { isMobile, isTablet } = useViewportMode();
  return (isMobile || isTablet) ? sources.mobile : sources.desktop;
};
