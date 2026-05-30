import React, { useState, useEffect } from 'react';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface OsWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  contentPadding?: string | number;
  overflow?: 'visible' | 'hidden';
}

export function OsWindow({ title, children, className = '', style, contentPadding, overflow = 'hidden' }: OsWindowProps) {
  const resolvedTheme = useResolvedTheme();

  return (
    <div
      className={`os-window border border-[#999] relative flex flex-col ${className}`}
      style={{
        boxShadow: resolvedTheme === 'light' ? '3px 3px 0px #666, 5px 5px 0px #444' : '2px 2px 0px #999, 4px 4px 0px #777',
        backgroundColor: '#F0EBE3',
        ...style
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          background: 'linear-gradient(180deg, #CCCCCC 0%, #AAAAAA 100%)',
          borderBottom: '1px solid #999',
          padding: '3px 6.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          userSelect: 'none',
          height: '24px',
          flexShrink: 0,
        }}
      >
        {resolvedTheme === 'light' ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Colored dots */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#27C93F', border: '0.5px solid #1AAB29' }} />
            {/* Unicode minimize and maximize */}
            <span style={{ fontFamily: 'Geneva, monospace', fontSize: '10px', fontWeight: 'bold', color: '#555', marginLeft: '2px', cursor: 'pointer', display: 'flex', gap: '3px' }}>
              <span title="Minimize" className="hover:text-black">─</span>
              <span title="Maximize" className="hover:text-black">□</span>
            </span>
          </div>
        ) : (
          /* Close / Minimize dots */
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F', border: '0.5px solid #1AAB29' }} />
          </div>
        )}
        <span
          style={{
            fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#000',
            flex: 1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </span>
      </div>
      {/* Content */}
      <div className={`flex-1 ${overflow === 'visible' ? 'overflow-visible' : 'overflow-hidden'}`} style={{ padding: contentPadding !== undefined ? contentPadding : '12px' }}>
        {children}
      </div>

      {/* Status Bar */}
      {resolvedTheme === 'light' && (
        <div
          style={{
            height: '16px',
            background: 'linear-gradient(180deg, #BBBBBB 0%, #999999 100%)',
            borderTop: '1px solid #888',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: '6px',
            paddingRight: '22px',
            userSelect: 'none',
            fontSize: '9px',
            fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
            color: '#000',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          <span>Ready</span>
          {/* resize grip: three diagonal lines */}
          <div 
            style={{
              position: 'absolute',
              right: '2px',
              bottom: '1px',
              width: '12px',
              height: '12px',
              background: 'linear-gradient(135deg, transparent 45%, #777 45%, #777 55%, transparent 55%, transparent 70%, #777 70%, #777 80%, transparent 80%, transparent 95%, #777 95%, #777 100%)',
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
