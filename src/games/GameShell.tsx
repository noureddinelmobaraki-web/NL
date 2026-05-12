import { ReactNode, useRef, useState, useEffect } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface GameShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  style?: React.CSSProperties;
}

export const GameShell = ({ title, onClose, children, style }: GameShellProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        background: '#0a0a0a',
        border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: isFullscreen ? '0' : '12px',
        overflow: 'hidden',
        width: '100%',
        maxWidth: isFullscreen ? '100%' : '520px',
        height: isFullscreen ? '100vh' : 'auto',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      <div style={{
        display: isFullscreen ? 'none' : 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10,
      }}>
        <span style={{
          color: 'white',
          fontWeight: 700,
          letterSpacing: '0.12em',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}>
          {title}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
          className="hover:opacity-100"
          title="Exit Fullscreen"
        >
          <Minimize2 size={20} />
        </button>
      )}

      <div style={{ 
        flex: 1,
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#000',
        overflow: 'hidden',
        height: isFullscreen ? '100%' : '520px', // Fixed height in shell instead of game
      }}>
        {children}
      </div>
    </div>
  );
};
