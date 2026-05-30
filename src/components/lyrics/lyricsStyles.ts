import type React from 'react';

export const aeroWindowStyle: React.CSSProperties = {
  background: 'var(--bg-glass-strong)',
  backdropFilter: 'var(--backdrop-blur)',
  WebkitBackdropFilter: 'var(--backdrop-blur)',
  border: '1px solid var(--border-subtle)',
  borderTop: '1.5px solid var(--border-strong)',
  borderRadius: '8px 8px 4px 4px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
};

export const aeroTitlebarStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  borderBottom: '1px solid var(--border-subtle)',
};
