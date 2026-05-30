export interface LensChromeProps {
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeIndex: number;
  totalPhotos: number;
  isMobile?: boolean;
}

export const LensChrome = ({
  onClose,
  isMuted,
  onToggleMute,
  activeIndex,
  totalPhotos,
  isMobile = false,
}: LensChromeProps) => {
  // Prevent compiler warnings for unused parameters under ButtonOrchestrator
  void onClose;
  void isMuted;
  void onToggleMute;
  return (
    <>
      {/* Vignette overlay */}
      {!isMobile && (
        <div style={{
          position: 'absolute', 
          inset: 0, 
          pointerEvents: 'none', 
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(var(--bg-page-rgb), 0.25) 100%)',
        }} />
      )}

      {/* TOP BAR */}
      <div style={{
        width: '100%', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        padding: isMobile ? '12px 16px' : '16px 20px',
        paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 8px)' : 'calc(env(safe-area-inset-top) + 16px)',
        background: isMobile ? 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)' : 'none',
        position: 'relative', 
        zIndex: 100,
      }}>
        {/* Title */}
        <div style={isMobile ? {
          fontFamily: 'inherit', 
          color: '#fff',
          fontSize: 'clamp(16px, 5vw, 22px)', 
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        } : {
          fontFamily: 'var(--font-manga)', 
          color: 'var(--text-primary)',
          fontSize: '18px', 
          fontWeight: 400,
          letterSpacing: '0.15em',
          textShadow: '0 0 20px rgba(var(--bg-page-rgb), 0.3)',
        }}>
          THROUGH THE LENS
        </div>

        {/* Inline dot indicators for tracking current slide */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          alignItems: 'center', 
          justifyContent: 'flex-end',
          minWidth: isMobile ? '80px' : '100px',
        }}>
          {Array.from({ length: totalPhotos }).map((_, i) => (
            <span
              key={i}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'background 250ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};
