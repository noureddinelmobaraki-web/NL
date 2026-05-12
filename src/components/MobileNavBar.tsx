import { useDeviceType } from "../hooks/useDeviceType";

interface MobileNavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const MobileNavBar = ({ currentPage, onNavigate }: MobileNavBarProps) => {
  const { isMobile } = useDeviceType();
  
  if (!isMobile) return null;

  const tabs = [
    { id: 'home', icon: '⊞', label: 'الرئيسية' },
    { id: 'songs', icon: '♪', label: 'أغانيا' },
    { id: 'drawings', icon: '✏', label: 'رسوماتي' },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'rgba(8, 8, 12, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        zIndex: 7000,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => {
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
              color: isActive ? 'white' : 'rgba(255, 255, 255, 0.35)',
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
                  background: 'white',
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
