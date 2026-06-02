// src/components/dev/MobileQAOverlay.tsx
import { useState, useEffect } from 'react';

export const MobileQAOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isLandscape, setIsLandscape] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [activeModals, setActiveModals] = useState<string[]>([]);
  const [hasQAQuery, setHasQAQuery] = useState(false);

  useEffect(() => {
    // Only verify in DEV mode
    if (!import.meta.env.DEV) return;

    // Check query params for ?qa=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('qa') === '1') {
      setHasQAQuery(true);
    }
  }, []);

  useEffect(() => {
    if (!hasQAQuery) return;

    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const checkStandalone = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
      setIsStandalone(isPWA);
    };

    const updateActiveModals = () => {
      const modals: string[] = [];
      if (document.querySelector('[role="dialog"]')) modals.push('Radix/Headless Dialog');
      if (document.querySelector('.mebit-gallery-fullscreen')) modals.push('MeBit Gallery');
      if (document.querySelector('.lens-gallery-modal')) modals.push('Lens Gallery');
      if (document.getElementById('music-mood-immersive-overlay')) modals.push('Music Mood Screen');
      if (document.querySelector('.song-lyrics-bottom-sheet')) modals.push('Song Lyrics Bottom Sheet');
      if (document.getElementById('drawings-fullscreen-overlay')) modals.push('Drawings Fullscreen');
      setActiveModals(prev => {
        if (prev.length === modals.length && prev.every((m, i) => m === modals[i])) return prev;
        return modals;
      });
    };

    handleResize();
    checkStandalone();
    updateActiveModals();

    window.addEventListener('resize', handleResize);
    const observer = new MutationObserver(updateActiveModals);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [hasQAQuery]);

  if (!import.meta.env.DEV || !hasQAQuery) return null;

  const getBreakpoint = (width: number) => {
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    return 'sm';
  };

  return (
    <div
      id="mobile-qa-overlay"
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        zIndex: 99999,
        fontFamily: 'monospace',
        fontSize: '11px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#00ff88',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #00ff88',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        maxWidth: '260px',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
        <strong>📱 MOBILE QA SCREEN</strong>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          style={{ background: 'none', border: 'none', color: '#00ff88', cursor: 'pointer', padding: '0 4px' }}
        >
          [{isOpen ? 'HIDE' : 'SHOW'}]
        </button>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>Viewport: {viewport.width}x{viewport.height}px</div>
          <div>Breakpoint: <span style={{ color: '#fff', fontWeight: 'bold' }}>{getBreakpoint(viewport.width)}</span></div>
          <div>Orientation: {isLandscape ? 'Landscape' : 'Portrait'}</div>
          <div>DPR: {window.devicePixelRatio.toFixed(2)}</div>
          <div>Cores: {navigator.hardwareConcurrency || 'unknown'}</div>
          <div>PWA Standalone: {isStandalone ? 'Yes' : 'No'}</div>
          <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '4px' }}>
            <strong>Active Modals:</strong>
            {activeModals.length === 0 ? (
              <div style={{ color: '#888' }}>None active</div>
            ) : (
              activeModals.map((m) => <div key={m} style={{ color: '#ff00ff' }}>• {m}</div>)
            )}
          </div>
        </div>
      )}
    </div>
  );
};
