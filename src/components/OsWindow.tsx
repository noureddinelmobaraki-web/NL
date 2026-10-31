import React, { useState, useEffect } from 'react';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface OsWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  contentPadding?: string | number;
  overflow?: 'visible' | 'hidden';
  icon?: string;
  onClose?: () => void;
}

export function OsWindow({
  title,
  children,
  className = '',
  style,
  contentPadding,
  overflow = 'hidden',
  icon,
  onClose,
}: OsWindowProps) {
  const resolvedTheme = useResolvedTheme();

  return (
    <div
      className={`os-window nl-os-window-glass relative flex flex-col ${className}`}
      style={style}
    >
      {/* Title Bar */}
      <div className="nl-os-window-titlebar">
        {icon && (
          <img src={icon} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
        )}
        {resolvedTheme === 'light' ? (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {/* Colored dots */}
            <div
              style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E', cursor: onClose ? 'pointer' : 'default' }}
              onClick={onClose}
              title={onClose ? 'Close' : undefined}
            />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#27C93F', border: '0.5px solid #1AAB29' }} />
            {/* Unicode minimize and maximize */}
            <span style={{ fontFamily: 'Geneva, monospace', fontSize: '10px', fontWeight: 'bold', opacity: 0.75, marginLeft: '3px', cursor: 'pointer', display: 'flex', gap: '4px' }}>
              <span title="Minimize">─</span>
              <span title="Maximize">□</span>
            </span>
          </div>
        ) : (
          /* Close / Minimize dots */
          <div style={{ display: 'flex', gap: '6px' }}>
            <div
              style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E', cursor: onClose ? 'pointer' : 'default' }}
              onClick={onClose}
              title={onClose ? 'Close' : undefined}
            />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F', border: '0.5px solid #1AAB29' }} />
          </div>
        )}
        <span
          style={{
            fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            flex: 1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 text-xs font-bold opacity-75 hover:opacity-100 hover:bg-white/15 rounded-full transition-all ml-auto flex-shrink-0"
            title="Close"
            aria-label="Close window"
          >
            ✕
          </button>
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 relative z-10 ${overflow === 'visible' ? 'overflow-visible' : 'overflow-hidden'}`} style={{ padding: contentPadding !== undefined ? contentPadding : '12px' }}>
        {children}
      </div>

      {/* Status Bar */}
      {resolvedTheme === 'light' && (
        <div className="nl-os-window-statusbar relative">
          <span>Ready</span>
          {/* resize grip: three diagonal lines */}
          <div 
            style={{
              position: 'absolute',
              right: '6px',
              bottom: '4px',
              width: '11px',
              height: '11px',
              background: 'linear-gradient(135deg, transparent 45%, currentColor 45%, currentColor 55%, transparent 55%, transparent 70%, currentColor 70%, currentColor 80%, transparent 80%, transparent 95%, currentColor 95%, currentColor 100%)',
              opacity: 0.45,
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

export function OsClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="whitespace-nowrap">
      {time.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' })}
      {' · '}
      {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
    </span>
  );
}

export default OsWindow;
