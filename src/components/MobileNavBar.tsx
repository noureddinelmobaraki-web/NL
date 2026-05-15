import { useDeviceType } from "../hooks/useDeviceType";

interface MobileNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isBgPlaying: boolean;
  onToggleBg: () => void;
}

export const MobileNavBar = ({ currentPage, onNavigate, isBgPlaying, onToggleBg }: MobileNavBarProps) => {
  const { isMobile, isTablet } = useDeviceType();
  
  if (!isMobile && !isTablet) return null;

  const tabs = [
    { id: 'home', icon: '⊞', label: 'الرئيسية' },
    { id: 'songs', icon: '♪', label: 'أغانيا' },
    ...(isTablet ? [{ id: 'lens', icon: '📷', label: 'LENS' }] : []),
    { id: 'drawings', icon: '✏', label: 'رسوماتي' },
    { id: 'music-toggle', icon: isBgPlaying ? '⏸' : '▶', label: isBgPlaying ? 'إيقاف' : 'تشغيل', isAction: true },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: isTablet ? '60px' : '56px',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        zIndex: 7000,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => {
        if (tab.isAction) {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={onToggleBg}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minHeight: '44px',
                position: 'relative',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: isBgPlaying ? 'var(--accent-yellow)' : 'var(--text-muted)',
                transition: 'color 0.2s',
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{tab.label}</span>
            </button>
          );
        }

        const isActive = currentPage === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '44px',
              position: 'relative',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}
          >
            {isActive && (
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: '2px',
                  background: 'var(--text-primary)',
                  borderRadius: '0 0 2px 2px'
                }} 
                aria-hidden="true"
              />
            )}
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
