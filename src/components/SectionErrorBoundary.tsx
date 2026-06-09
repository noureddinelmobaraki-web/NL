import { Component, ReactNode } from 'react';
import { isChunkLoadError } from '../utils/lazyWithRetry';
import { captureError } from '../utils/sentry';

interface Props { children: ReactNode; sectionName?: string; }
interface State { hasError: boolean; }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.props.sectionName || 'Section'}] crashed:`, error, info);
    } else {
      console.warn(`[${this.props.sectionName || 'Section'}] crashed:`, error.message);
    }

    captureError(error, { section: this.props.sectionName });

    // Auto-recover from a stale-deploy chunk fetch failure: reload ONCE.
    if (isChunkLoadError(error)) {
      const sentinel = 'nl_boundary_chunk_reload';
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(sentinel) === '1'; } catch { /* ignore */ }
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(sentinel, '1'); } catch { /* ignore */ }
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.sectionName === 'App') {
        return (
          <div style={{ 
            height: '100svh',  /* small viewport height — ignores browser chrome on iOS */
            minHeight: '100vh', /* fallback for older browsers */
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            padding: '20px',
            textAlign: 'center',
            background: '#080a14',
            color: '#fff',
            fontFamily: 'sans-serif'
          }}>
            <h2 style={{ fontSize: '24px', margin: 0 }}>عذراً، حدث خطأ ما</h2>
            <p style={{ opacity: 0.7, maxWidth: '400px' }}>
              واجه التطبيق مشكلة غير متوقعة. يرجى محاولة إعادة تحميل الصفحة.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: '#fff',
                color: '#080a14',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              إعادة التحميل
            </button>
          </div>
        );
      }

      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span>— section unavailable —</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '6px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'monospace',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
