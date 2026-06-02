import { useState, useEffect, useMemo } from 'react';

export interface BarGeometry {
  bottom: string;
  left: string;
  right: string;
  transform: string;
  maxWidth: string;
  width: string;
  borderRadius: string;
  scale: number;
  opacity: number;
}

export interface UseBarOrchestratorOptions {
  activeCardId: number | null;
  activeModalContext: string;
  isMobile: boolean;
  isTablet: boolean;
  suppressMiniBar?: boolean;
}

type Section = 'hero' | 'songs' | 'contact' | 'drawings' | 'other';

export function useBarOrchestrator({
  activeCardId,
  activeModalContext,
  isMobile,
  isTablet,
  suppressMiniBar = false,
}: UseBarOrchestratorOptions): {
  isBarVisible: boolean;
  geometry: BarGeometry;
} {
  const [isCardVisible, setIsCardVisible] = useState(true);
  const [currentSection, setCurrentSection] = useState<Section>('other');

  // Track active card visibility
  useEffect(() => {
    if (!activeCardId) {
      setIsCardVisible(true);
      return;
    }

    const cardEl = document.getElementById(`song-card-${activeCardId}`);
    if (!cardEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCardVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
        rootMargin: '0px',
      }
    );

    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [activeCardId]);

  // Track current scroll section
  useEffect(() => {
    const sectionMap: Record<string, Section> = {
      'my-songs-section': 'songs',
      'contact-section': 'contact',
      'drawings-section': 'drawings',
      'main-content': 'hero',
    };

    const observers: IntersectionObserver[] = [];

    Object.entries(sectionMap).forEach(([id, sectionName]) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setCurrentSection(sectionName);
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const isBarVisible = useMemo(() => {
    if (!activeCardId) return false;
    if (suppressMiniBar) return false;
    
    // Hide bar in any modal context except 'page'
    if (activeModalContext !== 'page') return false;
    
    if (isCardVisible) return false;

    // Direct DOM check for specific mobile states (visual safety)
    if (typeof document !== 'undefined') {
      if (document.body.classList.contains('drawings-fullscreen-active')) return false;
      if (document.body.classList.contains('keyboard-open')) return false;
    }

    return true;
  }, [activeCardId, suppressMiniBar, activeModalContext, isCardVisible]);

  const geometry = useMemo((): BarGeometry => {
    const base: BarGeometry = {
      bottom: (isMobile || isTablet) ? 'calc(var(--mobile-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 8px)' : '24px',
      left: (isMobile || isTablet) ? '8px' : '50%',
      right: (isMobile || isTablet) ? '8px' : 'auto',
      transform: (isMobile || isTablet) ? 'none' : 'translateX(-50%)',
      maxWidth: (isMobile || isTablet) ? 'none' : '540px',
      width: (isMobile || isTablet) ? 'auto' : '95vw',
      borderRadius: (isMobile || isTablet) ? '16px' : '28px',
      scale: 1,
      opacity: 1,
    };

    switch (currentSection) {
      case 'drawings':
        return {
          ...base,
          left: 'auto',
          right: (isMobile || isTablet) ? '12px' : '24px',
          transform: 'none',
          maxWidth: (isMobile || isTablet) ? '280px' : '360px',
          width: (isMobile || isTablet) ? '280px' : '360px',
          borderRadius: '20px',
          scale: 0.92,
          opacity: 0.95,
        };

      case 'contact':
        return {
          ...base,
          bottom: (isMobile || isTablet) ? 'calc(var(--mobile-nav-height, 64px) + env(safe-area-inset-bottom) + 20px)' : '40px',
          maxWidth: '480px',
          width: '90vw',
          scale: 0.95,
          opacity: 0.9,
        };

      case 'hero':
        return {
          ...base,
          maxWidth: '500px',
          scale: 0.95,
          opacity: 1,
        };

      case 'songs':
        return {
          ...base,
          scale: 0.88,
          opacity: 0.7,
        };

      default:
        return base;
    }
  }, [currentSection, isMobile, isTablet]);

  return { isBarVisible, geometry };
}
