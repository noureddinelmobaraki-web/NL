import React, { useEffect, useState, useMemo } from 'react';
import { RETRO_SECTIONS, RETRO_CDN } from './retro-data';
import { RetroSection, ProcessedRetroSection } from './RetroSection';
import { useAppContext } from '../../context/AppContext';
import { X } from 'lucide-react';
import Hls from 'hls.js';
import { PersonalPhotoFloater } from './PersonalPhotoFloater';

// Note: The missing section IDs in retro-data.ts (22, 23, 26) are intentional.
// The original Cameron's World preserved section numbering even when sections were dropped.

export const RetroWorldPage: React.FC = () => {
  const { setTheme, setAudioIntent } = useAppContext();
  const [scrollY, setScrollY] = useState(0);
  
  const [scaleFactor, setScaleFactor] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 600 ? 0.65 : 1;
    }
    return 1;
  });
  
  const [viewportHeight, setViewportHeight] = useState(() => 
    typeof window !== 'undefined' ? window.innerHeight : 1000
  );

  const processedSections = useMemo(() => {
    let currentOffset = 0;
    return RETRO_SECTIONS.map((sec) => {
      const originalHeight = parseInt(sec.height || '0', 10);
      const heightNum = originalHeight * scaleFactor;
      const offset = currentOffset;
      currentOffset += heightNum;
      return { ...sec, numericHeight: heightNum, offsetTop: offset, originalHeight } as ProcessedRetroSection;
    });
  }, [scaleFactor]);

  const TOTAL_BLOCK_HEIGHT = useMemo(() => 
    processedSections.reduce((sum, s) => sum + s.numericHeight, 0),
  [processedSections]);

  const [targetLoops, setTargetLoops] = useState(2);
  const dynamicTotalHeight = targetLoops * (TOTAL_BLOCK_HEIGHT || 1);

  useEffect(() => {
    // Accessibility & SEO guard
    const originalTitle = document.title;
    document.title = "NL Retro World";
    
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    meta.id = 'retro-noindex';
    document.head.appendChild(meta);

    const STYLE_ID = 'nl-retro-scrollbar-killer';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.innerHTML = `
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      body {
         background: #000;
      }
    `;
      document.head.appendChild(style);
    }

    // Initial resets
    window.scrollTo(0, 0);

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        setScrollY(sy);
        
        // Math virtualization handles infinite visual looping.
        // Cap dynamicTotalHeight at 500 loops (~6.6 million px) to avoid safe integer range limits.
        setTargetLoops(prev => {
          const CAP_LOOPS = 500;
          if (prev >= CAP_LOOPS) return prev;
          
          if (sy > (prev - 2) * TOTAL_BLOCK_HEIGHT) {
            return prev + 1;
          }
          return prev;
        });
        
        ticking = false;
      });
    };
    
    const handleResize = () => {
      setScaleFactor(window.innerWidth < 600 ? 0.65 : 1);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Background Audio setup (Kid Cudi - By Design)
    const audioUrl = "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Kid_Cudi_By_Design/Kid_Cudi_By_Design.m3u8";
    const audioEl = document.createElement('audio');
    audioEl.loop = true;
    let hlsInstance: Hls | null = null;
    
    // Aggressive AutoPlay Strategy
    const tryPlay = () => {
      audioEl.play().catch(e => console.log('Autoplay prevented, ready for user interaction', e));
    };

    if (Hls.isSupported()) {
      hlsInstance = new Hls();
      hlsInstance.loadSource(audioUrl);
      hlsInstance.attachMedia(audioEl);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, tryPlay);
    } else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
      audioEl.src = audioUrl;
      audioEl.addEventListener('loadedmetadata', tryPlay);
    }
    
    // Polyfill for autoplay blocks
    let audioCleanedUp = false;
    const userInteract = () => {
      if (audioCleanedUp) return;
      audioCleanedUp = true;
      tryPlay();
      window.removeEventListener('click', userInteract);
      window.removeEventListener('touchstart', userInteract);
      window.removeEventListener('scroll', userInteract);
    };
    window.addEventListener('click', userInteract, { once: true });
    window.addEventListener('touchstart', userInteract, { once: true });
    window.addEventListener('scroll', userInteract, { once: true });

    // Preload critical retro images
    const criticalImages = ['1/bg.png','1/1.png','1/6.png','1/6.gif','2/bg.png','3/bg.png'];
    criticalImages.forEach(src => {
      const img = new Image();
      img.src = `${RETRO_CDN}/${src}`;
    });

    return () => {
      document.title = originalTitle;
      const metaEl = document.getElementById('retro-noindex');
      if (metaEl) metaEl.remove();

      const styleEl = document.getElementById(STYLE_ID);
      if (styleEl) {
        document.head.removeChild(styleEl);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', userInteract);
      window.removeEventListener('touchstart', userInteract);
      window.removeEventListener('scroll', userInteract);
      
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      audioEl.pause();
      audioEl.src = '';
    };
  }, [TOTAL_BLOCK_HEIGHT]);

  // Memory hint for very long sessions
  useEffect(() => {
    let timeout: number | null = null;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        timeout = window.setTimeout(() => {
           const currentSy = window.scrollY;
           const modSy = currentSy % (TOTAL_BLOCK_HEIGHT || 1);
           window.scrollTo(0, modSy);
           setScrollY(modSy);
           setTargetLoops(Math.max(2, Math.ceil(modSy / (TOTAL_BLOCK_HEIGHT || 1)) + 2)); 
        }, 60000);
      } else {
        if (timeout) {
          window.clearTimeout(timeout);
          timeout = null;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (timeout) window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [TOTAL_BLOCK_HEIGHT]);

  const handleLeaveRetro = () => {
    setTheme('midnight');
    setAudioIntent('user-playing');
    window.scrollTo({ top: 0 });
    import('../../utils/userPrefs').then(({ savePrefs }) => {
      savePrefs({ audioIntent: 'user-playing' });
    });
  };

  const visibleItems = useMemo(() => {
    const buffer = viewportHeight * 1.5; 
    const minY = Math.max(0, scrollY - buffer);
    const maxY = scrollY + viewportHeight + buffer;

    const startLoopIndex = Math.floor(minY / (TOTAL_BLOCK_HEIGHT || 1));
    const endLoopIndex = Math.floor(maxY / (TOTAL_BLOCK_HEIGHT || 1));

    const items = [];
    for (let loop = startLoopIndex; loop <= endLoopIndex; loop++) {
      for (const [index, sec] of processedSections.entries()) {
        const top = loop * TOTAL_BLOCK_HEIGHT + sec.offsetTop;
        const bottom = top + sec.numericHeight;
        
        if (bottom > minY && top < maxY) {
          items.push({
            key: `v-${loop}-${sec.id}-${index}`,
            top,
            sec
          });
        }
      }
    }
    return items;
  }, [scrollY, viewportHeight, processedSections, TOTAL_BLOCK_HEIGHT]);

  return (
    <div
      role="region"
      aria-label="Retro 90s collage"
      style={{
        width: '100%',
        minHeight: '100vh',
        height: `${dynamicTotalHeight}px`,
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 'calc(env(safe-area-inset-right, 0px) + 16px)', zIndex: 99999 }}>
        <button
          onClick={handleLeaveRetro}
          style={{
            background: 'rgba(255, 0, 0, 0.85)',
            border: '2px solid rgba(255, 0, 0, 1)',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.6), inset 0 0 5px rgba(255, 255, 255, 0.3)',
            transition: 'transform 0.2s',
          }}
          title="خروج من الوضع"
        >
          <X size={24} strokeWidth={3} />
        </button>
      </div>

      {visibleItems.map(item => (
        <div
          key={item.key}
          style={{
            position: 'absolute',
            top: `${item.top}px`,
            left: 0,
            width: '100%',
            height: `${item.sec.numericHeight}px`,
          }}
        >
          <RetroSection section={item.sec} scaleFactor={scaleFactor} />
        </div>
      ))}
      <PersonalPhotoFloater scrollY={scrollY} viewportHeight={viewportHeight} />
    </div>
  );
};
