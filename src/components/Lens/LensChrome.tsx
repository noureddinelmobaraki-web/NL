import { useViewportSize } from '../../hooks/useViewportSize';
import { useTranslation } from 'react-i18next';

export interface LensChromeProps {
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeIndex: number;
  totalPhotos: number;
  isMobile?: boolean;
  visible: boolean;
  onOpenEditor?: () => void;
}

export const LensChrome = ({
  onClose,
  isMuted,
  onToggleMute,
  activeIndex,
  totalPhotos,
  isMobile = false,
  visible = true,
  onOpenEditor,
}: LensChromeProps) => {
  const { t } = useTranslation();
  const viewport = useViewportSize();
  
  const isLandscape = (isMobile || isMobile === undefined) && viewport.isLandscape;

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
      <div className="mid-lens-chrome" style={{
        width: '100%', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        height: isLandscape ? '44px' : (isMobile ? '60px' : 'auto'),
        padding: isLandscape ? '4px 20px' : (isMobile ? '12px 20px' : '16px 20px'),
        paddingTop: isLandscape ? 'calc(env(safe-area-inset-top) + 4px)' : (isMobile ? 'calc(env(safe-area-inset-top) + 8px)' : 'calc(env(safe-area-inset-top) + 16px)'),
        background: isMobile ? 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' : 'none',
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 300ms ease, transform 300ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        {/* Title / Counter */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '2px' : '20px'
        }}>
          <div className="glass-adaptive-text" style={isMobile ? {
            fontFamily: 'inherit', 
            fontSize: isLandscape ? '14px' : '18px', 
            fontWeight: 700,
            letterSpacing: '-0.02em',
          } : {
            fontFamily: 'var(--font-manga)', 
            fontSize: '18px', 
            fontWeight: 400,
            letterSpacing: '0.15em',
          }}>
            {isMobile ? 'LENS GALLERY' : 'THROUGH THE LENS'}
          </div>
          
          <span className="glass-adaptive-text" style={{ 
            fontSize: isMobile ? '11px' : '14px', 
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.05em',
            opacity: 0.7
          }}>
            {activeIndex + 1} / {totalPhotos}
          </span>
        </div>

        {/* Top Right Actions */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onOpenEditor}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t('lens.edit_photo', 'تعديل في Image95')}
          >
            <img src="/image95/assets/icons8-windows-95-144.png" alt="" className="w-4 h-4 object-contain" />
            <span className="hidden sm:inline">{t('lens.edit', 'Image95')}</span>
          </button>

          {isMobile && (
            <button
              onClick={onToggleMute}
              style={{
                width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '50%',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: '16px'
              }}
            >
              {isMuted ? '🔇' : '🎵'}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              background: isMobile ? 'rgba(255,255,255,0.15)' : 'rgba(var(--bg-page-rgb), 0.8)',
              border: isMobile ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--border-subtle)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50%',
              color: isMobile ? 'white' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
};
