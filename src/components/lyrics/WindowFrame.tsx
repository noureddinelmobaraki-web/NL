import React, { useState, useRef, useEffect } from 'react';
import { X, LucideIcon } from 'lucide-react';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { WindowGeometry } from '../../types';
import { aeroWindowStyle, aeroTitlebarStyle } from './lyricsStyles';

export const WindowFrame = ({ 
  title, 
  icon: Icon, 
  children, 
  geometry, 
  setGeometry, 
  zIndex, 
  onFocus, 
  isFocused, 
  onClose,
  state: externalState
}: { 
  title: string; 
  icon: LucideIcon; 
  children: React.ReactNode; 
  geometry: WindowGeometry; 
  setGeometry: (g: WindowGeometry) => void;
  zIndex: number;
  onFocus: () => void;
  isFocused: boolean;
  onClose: () => void;
  state?: 'normal' | 'maximized' | 'minimized';
}) => {
  const [state, setState] = useState<'normal' | 'maximized' | 'minimized'>(externalState || 'normal');
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { isMobile } = useDeviceType();
  const windowRef = useFocusTrap(isFocused);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (state === 'maximized') return;
    onFocus();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - geometry.x,
      y: e.clientY - geometry.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const nx = e.clientX - dragOffset.current.x;
      const ny = e.clientY - dragOffset.current.y;
      setGeometry({ ...geometry, x: nx, y: ny });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, geometry, setGeometry]);

  const toggleMaximize = () => setState(s => s === 'maximized' ? 'normal' : 'maximized');

  return (
    <div 
      ref={windowRef}
      style={{
        position: 'fixed',
        left: state === 'maximized' ? 0 : geometry.x,
        top: state === 'maximized' ? 0 : geometry.y,
        width: state === 'maximized' ? '100%' : geometry.width,
        height: state === 'maximized' ? '100%' : geometry.height,
        zIndex,
        display: state === 'minimized' ? 'none' : 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        transition: 'box-shadow 0.2s',
        ...aeroWindowStyle,
        boxShadow: isFocused 
          ? `0 25px 50px -12px rgba(0,0,0,0.5), ${aeroWindowStyle.boxShadow as string}` 
          : aeroWindowStyle.boxShadow
      }}
      onMouseDown={onFocus}
    >
      <div 
        style={{
          height: '32px',
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: state === 'maximized' ? 'default' : 'move',
          flexShrink: 0,
          transition: 'background 0.2s ease',
          zIndex: 12,
          ...aeroTitlebarStyle
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: '13px', fontWeight: 500 }}>
          <Icon size={16} aria-hidden="true" style={{ opacity: 0.8 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', textShadow: '0 0 10px rgba(var(--bg-page-rgb),0.5)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={toggleMaximize}
            style={{ 
              width: '28px', 
              height: '18px', 
              background: 'rgba(var(--text-primary-rgb),0.1)', 
              border: '1px solid var(--border-subtle)', 
              color: 'var(--text-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 0, 
              borderRadius: '3px', 
              cursor: 'pointer',
            }}
            aria-label={state === 'maximized' ? 'Restore' : 'Maximize'}
          >
            <div style={{ width: '10px', height: '8px', border: '1px solid currentColor', opacity: 0.7 }} aria-hidden="true" />
          </button>
          <button 
            onClick={onClose}
            style={{ 
              width: '45px', 
              height: '18px', 
              background: 'linear-gradient(180deg, #f08080 0%, #e05050 45%, #d03030 50%, #b02020 100%)', 
              border: '1px solid rgba(0,0,0,0.3)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 0, 
              borderRadius: '3px',
              cursor: 'pointer',
              boxShadow: '0 0 2px rgba(255,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
            aria-label="Close window"
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};
